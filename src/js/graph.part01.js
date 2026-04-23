(() => {
  const { FIELD_LABELS, FIELD_META, GRAPH_ENTITY_TYPE_OPTIONS } = window.OSINT_CONFIG;
  const { truncate, addAlpha } = window.OSINT_UTILS;
  const { getSubjectLabel } = window.OSINT_SEARCHES;

  const ENTITY_META = Object.fromEntries(GRAPH_ENTITY_TYPE_OPTIONS.map((option) => [option.value, option]));
  const VIEWBOX = { width: 920, height: 460, padding: 56 };

  const FIELD_CLUSTER_MAP = {
    name: "identity",
    surname: "identity",
    username: "footprint",
    email: "footprint",
    phone: "footprint",
    location: "geoVisual",
    imageDataUrl: "geoVisual",
  };

  const ENTITY_CLUSTER_MAP = {
    alias: "persona",
    contact: "persona",
    social: "social",
    organization: "organization",
    document: "organization",
    location: "geoOps",
    note: "geoOps",
  };

  const CLUSTER_META = {
    identity: {
      label: "Identity Cluster",
      tone: "#61d0ff",
      kind: "core",
      order: 0,
      offsetX: -184,
      offsetY: -116,
      columns: 2,
      spacingX: 116,
      spacingY: 86,
    },
    footprint: {
      label: "Digital Footprint",
      tone: "#1dc2b1",
      kind: "core",
      order: 1,
      offsetX: 214,
      offsetY: -28,
      columns: 2,
      spacingX: 120,
      spacingY: 86,
    },
    geoVisual: {
      label: "Geo / Visual",
      tone: "#c793ff",
      kind: "core",
      order: 2,
      offsetX: -8,
      offsetY: 154,
      columns: 2,
      spacingX: 118,
      spacingY: 86,
    },
    persona: {
      label: "Aliases & Contacts",
      tone: "#1dc2b1",
      kind: "manual",
      order: 3,
      offsetX: -306,
      offsetY: -150,
      columns: 2,
      spacingX: 110,
      spacingY: 82,
    },
    social: {
      label: "Social Surface",
      tone: "#61d0ff",
      kind: "manual",
      order: 4,
      offsetX: 312,
      offsetY: -154,
      columns: 2,
      spacingX: 110,
      spacingY: 82,
    },
    organization: {
      label: "Orgs & Documents",
      tone: "#ffd06b",
      kind: "manual",
      order: 5,
      offsetX: 294,
      offsetY: 164,
      columns: 2,
      spacingX: 110,
      spacingY: 82,
    },
    geoOps: {
      label: "Locations & Notes",
      tone: "#c793ff",
      kind: "manual",
      order: 6,
      offsetX: -306,
      offsetY: 166,
      columns: 2,
      spacingX: 110,
      spacingY: 82,
    },
    misc: {
      label: "Other Signals",
      tone: "#8fa3b7",
      kind: "manual",
      order: 7,
      offsetX: 0,
      offsetY: -188,
      columns: 2,
      spacingX: 110,
      spacingY: 82,
    },
  };

  function renderGraph(svg, record, handlers = {}) {
    const { onNodeSelect = () => {}, onNodeMove = () => {} } = handlers;
    svg.innerHTML = "";

    const center = { x: 460, y: 225 };
    const activeNodeId = record.graphFocusId || record.focusField || "";
    const coreNodes = applySavedPositions(buildCoreNodes(record), record.graphLayout || {});
    const manualNodes = applySavedPositions(buildManualNodes(record), record.graphLayout || {});

    if (!coreNodes.length && !manualNodes.length) {
      renderEmptyGraphState(svg, center);
      return;
    }

    const subjectNode = clampNodePosition(
      applySavedPosition(
        {
          id: "subject",
          x: center.x,
          y: center.y,
          radius: 66,
          title: getSubjectLabel(record),
          value: record.caseName ? "Case anchor" : "Target subject",
          fill: "rgba(29, 194, 177, 0.18)",
          stroke: "rgba(29, 194, 177, 0.48)",
          kind: "subject",
        },
        record.graphLayout || {}
      )
    );

    const positionedCoreNodes = layoutClusteredNodes(coreNodes, subjectNode);
    const positionedManualNodes = layoutClusteredNodes(manualNodes, subjectNode);

    const nodes = [subjectNode, ...positionedCoreNodes, ...positionedManualNodes];
    const nodeMap = new Map(nodes.map((node) => [node.id, node]));
    const nodeVisuals = new Map();
    const connectionVisuals = [];
    const relationVisuals = [];
    const clusterVisuals = renderClusters(svg, [...positionedCoreNodes, ...positionedManualNodes], activeNodeId);

    renderCoreLinks(svg, subjectNode, positionedCoreNodes, activeNodeId, connectionVisuals);
    renderGuideLinks(svg, subjectNode, positionedManualNodes, record.graphRelations || [], activeNodeId, connectionVisuals);
    renderManualRelations(svg, nodeMap, record.graphRelations || [], activeNodeId, relationVisuals);
    nodes.forEach((node) => {
      renderNode(svg, node, activeNodeId, nodeVisuals, onNodeSelect, onNodeMove, () => {
        syncNodeVisual(nodeVisuals.get(node.id), node);
        syncConnections(connectionVisuals, nodeMap, activeNodeId);
        syncRelationVisuals(relationVisuals, nodeMap, activeNodeId);
        syncClusterVisuals(clusterVisuals, nodeMap, activeNodeId);
      });
    });
  }

  function renderEmptyGraphState(svg, center) {
    svg.innerHTML = `
      <g>
        <circle cx="${center.x}" cy="${center.y}" r="82" fill="rgba(29,194,177,0.12)" stroke="rgba(29,194,177,0.38)" />
        <text x="${center.x}" y="${center.y - 4}" text-anchor="middle" class="node-title" fill="#eff5fb">Aggiungi dati</text>
        <text x="${center.x}" y="${center.y + 20}" text-anchor="middle" class="node-value" fill="#9db0c1">Nome, username, email, telefono, luogo, immagine o nodi manuali</text>
      </g>
    `;
  }

  function buildCoreNodes(record) {
    return Object.keys(FIELD_LABELS)
      .filter((field) => Boolean(record[field]))
      .map((field) => {
        const meta = FIELD_META[field];
        const value =
          field === "imageDataUrl"
            ? truncate(record.imageName || "Immagine collegata", 26)
            : truncate(record[field], 26);

        return {
          id: `field:${field}`,
          field,
          clusterId: FIELD_CLUSTER_MAP[field] || "misc",
          radius: 52,
          title: FIELD_LABELS[field],
          value,
          fill: addAlpha(meta.tone, 0.16),
          stroke: addAlpha(meta.tone, 0.55),
          kind: "core",
        };
      });
  }

  function buildManualNodes(record) {
    return (record.graphEntities || []).map((entity) => {
      const meta = ENTITY_META[entity.type] || ENTITY_META.note || { label: entity.type, tone: "#8fa3b7" };
      const value = entity.value || entity.notes || meta.label;

      return {
        id: entity.id,
        clusterId: ENTITY_CLUSTER_MAP[entity.type] || "misc",
        radius: 46,
        title: truncate(entity.label || meta.label, 28),
        value: truncate(value, 30),
        fill: addAlpha(meta.tone, 0.14),
        stroke: addAlpha(meta.tone, 0.5),
        kind: "manual",
      };
    });
  }

  function layoutClusteredNodes(nodes, subjectNode) {
    const grouped = new Map();
    const positioned = new Map();

    nodes.forEach((node) => {
      const clusterId = node.clusterId || "misc";
      if (!grouped.has(clusterId)) {
        grouped.set(clusterId, []);
      }
      grouped.get(clusterId).push(node);
    });

    grouped.forEach((clusterNodes, clusterId) => {
      const blueprint = CLUSTER_META[clusterId] || CLUSTER_META.misc;
      const anchor = {
        x: subjectNode.x + blueprint.offsetX,
        y: subjectNode.y + blueprint.offsetY,
      };

      applyClusterLayout(clusterNodes, anchor, blueprint).forEach((node) => {
        positioned.set(node.id, node);
      });
    });

    return nodes.map((node) => positioned.get(node.id) || clampNodePosition(node));
  }

  function applyClusterLayout(nodes, anchor, blueprint) {
    const pending = nodes.filter((node) => !hasPosition(node));
    const pendingPositions = new Map();
    const columns = Math.min(3, Math.max(1, Math.min(blueprint.columns || 2, pending.length || 1)));
    const rows = Math.max(1, Math.ceil((pending.length || 1) / columns));

    pending.forEach((node, index) => {
      const row = Math.floor(index / columns);
      const column = index % columns;
      const offsetX = (column - (columns - 1) / 2) * blueprint.spacingX;
      const offsetY = (row - (rows - 1) / 2) * blueprint.spacingY;
      pendingPositions.set(
        node.id,
        clampNodePosition({
          ...node,
          x: anchor.x + offsetX,
          y: anchor.y + offsetY,
        })
      );
    });

    return nodes.map((node) => {
      if (hasPosition(node)) {
        return clampNodePosition(node);
      }

      return pendingPositions.get(node.id) || clampNodePosition(node);
    });
  }

  function renderClusters(svg, nodes, activeNodeId) {
    const ns = "http://www.w3.org/2000/svg";
    const nodeMap = new Map(nodes.map((node) => [node.id, node]));

    return collectClusters(nodes).map((cluster) => {
      const group = document.createElementNS(ns, "g");
      const halo = document.createElementNS(ns, "ellipse");
      const label = document.createElementNS(ns, "text");
      const count = document.createElementNS(ns, "text");

      label.setAttribute("class", "graph-cluster-label");
      count.setAttribute("class", "graph-cluster-count");
      label.setAttribute("text-anchor", "start");
      count.setAttribute("text-anchor", "start");
      halo.setAttribute("rx", "10");
      halo.setAttribute("ry", "10");

      group.append(halo, label, count);
      svg.append(group);

      const visual = {
        ...cluster,
        group,
        halo,
        label,
        count,
      };

      syncSingleClusterVisual(visual, nodeMap, activeNodeId);
      return visual;
    });
  }

  function collectClusters(nodes) {
    const grouped = new Map();

    nodes.forEach((node) => {
      const clusterId = node.clusterId || "misc";
      const blueprint = CLUSTER_META[clusterId] || CLUSTER_META.misc;

      if (!grouped.has(clusterId)) {
        grouped.set(clusterId, {
          id: clusterId,
          nodeIds: [],
          labelText: blueprint.label,
          tone: blueprint.tone,
          kind: blueprint.kind,
          order: blueprint.order,
        });
      }

      grouped.get(clusterId).nodeIds.push(node.id);
    });

    return [...grouped.values()].sort((left, right) => left.order - right.order);
  }

  function syncClusterVisuals(clusterVisuals, nodeMap, activeNodeId) {
    clusterVisuals.forEach((visual) => {
      syncSingleClusterVisual(visual, nodeMap, activeNodeId);
    });
  }

  function syncSingleClusterVisual(visual, nodeMap, activeNodeId) {
    const clusterNodes = visual.nodeIds.map((id) => nodeMap.get(id)).filter(Boolean);

    if (!clusterNodes.length) {
      visual.group.setAttribute("display", "none");
      return;
    }

    const bounds = getClusterBounds(clusterNodes);
    visual.group.removeAttribute("display");
    visual.group.setAttribute(
      "class",
      `graph-cluster graph-cluster-${visual.kind}${isDimmed(activeNodeId, visual.nodeIds) ? " dimmed" : ""}`
    );
    visual.halo.setAttribute("cx", bounds.cx);
    visual.halo.setAttribute("cy", bounds.cy);
    visual.halo.setAttribute("rx", bounds.rx);
    visual.halo.setAttribute("ry", bounds.ry);
    visual.halo.setAttribute("fill", addAlpha(visual.tone, visual.kind === "core" ? 0.085 : 0.06));
    visual.halo.setAttribute("stroke", addAlpha(visual.tone, visual.kind === "core" ? 0.34 : 0.24));
    visual.halo.setAttribute("stroke-width", visual.kind === "core" ? "1.4" : "1.15");
    visual.label.setAttribute("x", bounds.labelX);
    visual.label.setAttribute("y", bounds.labelY);
    visual.label.textContent = visual.labelText;
    visual.count.setAttribute("x", bounds.labelX);
    visual.count.setAttribute("y", bounds.labelY + 16);
    visual.count.textContent = clusterNodes.length === 1 ? "1 nodo" : `${clusterNodes.length} nodi`;
  }

  function getClusterBounds(nodes) {
    const minX = Math.min(...nodes.map((node) => node.x - node.radius)) - 28;
    const maxX = Math.max(...nodes.map((node) => node.x + node.radius)) + 28;
    const minY = Math.min(...nodes.map((node) => node.y - node.radius)) - 42;
    const maxY = Math.max(...nodes.map((node) => node.y + node.radius)) + 34;

