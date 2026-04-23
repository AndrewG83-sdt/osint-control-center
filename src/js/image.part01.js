(() => {
  const { getFullName } = window.OSINT_SEARCHES;
  const { formatDate } = window.OSINT_UTILS;

  const JPEG_EXIF_TAGS = {
    0x010f: "make",
    0x0110: "model",
    0x0112: "orientation",
    0x0131: "software",
    0x0132: "modifiedAt",
    0x8769: "exifPointer",
    0x8825: "gpsPointer",
  };

  const EXIF_SUB_TAGS = {
    0x9003: "capturedAt",
    0x9004: "digitizedAt",
    0xa002: "pixelWidth",
    0xa003: "pixelHeight",
    0x8827: "iso",
    0x829a: "exposureTime",
    0x829d: "fNumber",
    0x920a: "focalLength",
    0x9209: "flash",
  };

  const GPS_TAGS = {
    0x0001: "latitudeRef",
    0x0002: "latitude",
    0x0003: "longitudeRef",
    0x0004: "longitude",
    0x0005: "altitudeRef",
    0x0006: "altitude",
  };

  const TYPE_SIZES = {
    1: 1,
    2: 1,
    3: 2,
    4: 4,
    5: 8,
    7: 1,
    9: 4,
    10: 8,
  };

  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function readFileAsArrayBuffer(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  }

  async function inspectImageFile(file) {
    const previewDataUrl = await readImagePreview(file);
    const [exif, ocr] = await Promise.all([extractExifFromFile(file), detectTextFromFile(file)]);

    return {
      previewDataUrl,
      exif,
      ocr,
      analyzedAt: new Date().toISOString(),
    };
  }

  async function reanalyzeImageFromDataUrl(dataUrl) {
    const ocr = await detectTextFromDataUrl(dataUrl);
    return {
      ocr,
      analyzedAt: new Date().toISOString(),
    };
  }

  async function readImagePreview(file) {
    const original = await readFileAsDataUrl(file);

    if (!file.type.startsWith("image/")) {
      return original;
    }

    return optimizeImageDataUrl(original);
  }

  function optimizeImageDataUrl(dataUrl) {
    return new Promise((resolve) => {
      const image = new Image();

      image.onload = () => {
        const maxDimension = 1400;
        const maxSide = Math.max(image.width, image.height);
        const scale = Math.min(1, maxDimension / maxSide);

        if (scale === 1 && dataUrl.length < 1400000) {
          resolve(dataUrl);
          return;
        }

        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));

        const context = canvas.getContext("2d");
        if (!context) {
          resolve(dataUrl);
          return;
        }

        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.84));
      };

      image.onerror = () => resolve(dataUrl);
      image.src = dataUrl;
    });
  }

  async function extractExifFromFile(file) {
    if (!file.type.includes("jpeg") && !file.type.includes("jpg")) {
      return {
        available: false,
        source: "none",
        summary: "EXIF non disponibile: il parser locale legge solo JPEG/JPG.",
      };
    }

    try {
      const buffer = await readFileAsArrayBuffer(file);
      return parseExifFromBuffer(buffer);
    } catch {
      return {
        available: false,
        source: "error",
        summary: "Impossibile leggere i metadati EXIF dal file selezionato.",
      };
    }
  }

  function parseExifFromBuffer(arrayBuffer) {
    const view = new DataView(arrayBuffer);

    if (view.getUint16(0, false) !== 0xffd8) {
      return {
        available: false,
        source: "none",
        summary: "Il file non contiene un header JPEG valido per EXIF.",
      };
    }

    let offset = 2;

    while (offset < view.byteLength) {
      const marker = view.getUint16(offset, false);
      offset += 2;

      if (marker === 0xffda || marker === 0xffd9) {
        break;
      }

      const segmentLength = view.getUint16(offset, false);
      if (marker === 0xffe1 && isExifSegment(view, offset + 2)) {
        return extractExifPayload(view, offset + 2);
      }

      offset += segmentLength;
    }

    return {
      available: false,
      source: "none",
      summary: "Nessun blocco EXIF trovato nell'immagine.",
    };
  }

  function isExifSegment(view, start) {
    return (
      getAscii(view, start, 4) === "Exif" &&
      view.getUint8(start + 4) === 0 &&
      view.getUint8(start + 5) === 0
    );
  }

  function extractExifPayload(view, exifStart) {
    const tiffStart = exifStart + 6;
    const byteOrder = getAscii(view, tiffStart, 2);
    const little = byteOrder === "II";

    if (!little && byteOrder !== "MM") {
      return {
        available: false,
        source: "invalid",
        summary: "Byte order EXIF non riconosciuto.",
      };
    }

    const fortyTwo = view.getUint16(tiffStart + 2, little);
    if (fortyTwo !== 42) {
      return {
        available: false,
        source: "invalid",
        summary: "Struttura TIFF EXIF non valida.",
      };
    }

    const ifd0Offset = view.getUint32(tiffStart + 4, little);
    const base = readIfd(view, tiffStart, tiffStart + ifd0Offset, little, JPEG_EXIF_TAGS);
    const exifDetails = base.exifPointer
      ? readIfd(view, tiffStart, tiffStart + Number(base.exifPointer), little, EXIF_SUB_TAGS)
      : {};
    const gpsDetails = base.gpsPointer
      ? readIfd(view, tiffStart, tiffStart + Number(base.gpsPointer), little, GPS_TAGS)
      : {};

    return normalizeExif({ ...base, ...exifDetails }, gpsDetails);
  }

  function readIfd(view, tiffStart, ifdOffset, little, tags) {
    const result = {};

    if (ifdOffset <= 0 || ifdOffset >= view.byteLength) {
      return result;
    }

    const entries = view.getUint16(ifdOffset, little);

    for (let index = 0; index < entries; index += 1) {
      const entryOffset = ifdOffset + 2 + index * 12;
      const tagId = view.getUint16(entryOffset, little);
      const type = view.getUint16(entryOffset + 2, little);
      const count = view.getUint32(entryOffset + 4, little);
      const key = tags[tagId];

      if (!key || !TYPE_SIZES[type]) {
        continue;
      }

      const totalSize = TYPE_SIZES[type] * count;
      const valueOffset = totalSize <= 4 ? entryOffset + 8 : tiffStart + view.getUint32(entryOffset + 8, little);
      result[key] = readValue(view, type, count, valueOffset, little);
    }

    return result;
  }

  function readValue(view, type, count, valueOffset, little) {
    const values = [];

    if (type === 2) {
      return getAscii(view, valueOffset, count).replace(/\0+$/, "").trim();
    }

    for (let index = 0; index < count; index += 1) {
      const offset = valueOffset + index * TYPE_SIZES[type];

      switch (type) {
        case 1:
        case 7:
          values.push(view.getUint8(offset));
          break;
        case 3:
          values.push(view.getUint16(offset, little));
          break;
        case 4:
          values.push(view.getUint32(offset, little));
          break;
        case 5: {
          const numerator = view.getUint32(offset, little);
          const denominator = view.getUint32(offset + 4, little) || 1;
          values.push(numerator / denominator);
          break;
        }
        case 9:
          values.push(view.getInt32(offset, little));
          break;
        case 10: {
          const numerator = view.getInt32(offset, little);
          const denominator = view.getInt32(offset + 4, little) || 1;
          values.push(numerator / denominator);
          break;
        }
        default:
          break;
      }
    }

    return count === 1 ? values[0] : values;
  }

  function normalizeExif(exifData, gpsData) {
    const latitude = convertGpsCoordinate(gpsData.latitude, gpsData.latitudeRef);
    const longitude = convertGpsCoordinate(gpsData.longitude, gpsData.longitudeRef);
    const altitude =
      typeof gpsData.altitude === "number"
        ? `${gpsData.altitudeRef === 1 ? "-" : ""}${gpsData.altitude.toFixed(1)} m`
        : "";

    const coordinates =
      typeof latitude === "number" && typeof longitude === "number"
        ? `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
        : "";

    const summaryParts = [
      exifData.make && exifData.model ? `${exifData.make} ${exifData.model}` : exifData.make || exifData.model,
      exifData.capturedAt || exifData.modifiedAt,
      coordinates,
    ].filter(Boolean);

    return {
      available: Boolean(summaryParts.length || exifData.software || exifData.iso || exifData.pixelWidth),
      source: "jpeg-exif",
      summary: summaryParts.length
        ? summaryParts.join(" / ")
        : "Nessun metadato EXIF significativo trovato.",
      make: normalizeTextValue(exifData.make),
      model: normalizeTextValue(exifData.model),
      software: normalizeTextValue(exifData.software),
      orientation: normalizeOrientation(exifData.orientation),
      capturedAt: normalizeTextValue(exifData.capturedAt),
      modifiedAt: normalizeTextValue(exifData.modifiedAt),
      digitizedAt: normalizeTextValue(exifData.digitizedAt),
      dimensions:
        exifData.pixelWidth && exifData.pixelHeight
          ? `${Math.round(exifData.pixelWidth)} x ${Math.round(exifData.pixelHeight)}`
          : "",
      iso: exifData.iso ? String(Math.round(exifData.iso)) : "",
      exposureTime: formatExposure(exifData.exposureTime),
      fNumber: exifData.fNumber ? `f/${Number(exifData.fNumber).toFixed(1)}` : "",
      focalLength: exifData.focalLength ? `${Number(exifData.focalLength).toFixed(0)} mm` : "",
      flash: typeof exifData.flash === "number" ? (exifData.flash ? "Si" : "No") : "",
      gps: coordinates
        ? {
            coordinates,
            latitude,
            longitude,
            altitude,
          }
        : null,
    };
  }

  function normalizeTextValue(value) {
    return typeof value === "string" ? value.trim() : "";
  }

  function normalizeOrientation(value) {
    const labels = {
      1: "Normale",
      3: "Ruotata 180",
      6: "Ruotata 90 CW",
      8: "Ruotata 90 CCW",
    };

    return labels[value] || (value ? `Codice ${value}` : "");
  }

  function formatExposure(value) {
    if (!value || Number.isNaN(value)) {
      return "";
    }

    if (value >= 1) {
      return `${value.toFixed(1)} s`;
    }

    const reciprocal = Math.round(1 / value);
    return reciprocal ? `1/${reciprocal} s` : `${value.toFixed(3)} s`;
  }

  function convertGpsCoordinate(value, ref) {
    if (!Array.isArray(value) || value.length < 3) {
      return null;
    }

    const decimal = Number(value[0]) + Number(value[1]) / 60 + Number(value[2]) / 3600;
    if (ref === "S" || ref === "W") {
      return -decimal;
    }

    return decimal;
  }

  function getAscii(view, start, length) {
    let result = "";

    for (let index = 0; index < length; index += 1) {
      result += String.fromCharCode(view.getUint8(start + index));
    }

    return result;
  }

  async function detectTextFromFile(file) {
    if (!("TextDetector" in window)) {
      return unsupportedOcrResult();
    }

    try {
      const detector = new window.TextDetector();
      if (typeof createImageBitmap === "function") {
        const bitmap = await createImageBitmap(file);
        const blocks = await detector.detect(bitmap);
        if (typeof bitmap.close === "function") {
          bitmap.close();
        }

        return normalizeOcrBlocks(blocks);
      }

      const dataUrl = await readFileAsDataUrl(file);
      const image = await loadImage(dataUrl);
      const blocks = await detector.detect(image);
      return normalizeOcrBlocks(blocks);
    } catch {
      return {
        status: "error",
        supported: true,
        fullText: "",
        lines: [],
        analyzedAt: new Date(