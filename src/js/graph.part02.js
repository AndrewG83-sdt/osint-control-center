    return {
      cx: (minX + maxX) / 2,
      cy: (minY + maxY) / 2,
      rx: Math.max(82, (maxX - minX) / 2),
      ry: Math.max(62, (maxY - minY) / 2),
      labelX: clamp(minX + 18, VIEWBOX.padding, VIEWBOX.width - 160),
      labelY: clamp(minY + 24, VIEWBOX.padding, VIEWBOX.height - 32),
    };
  }

  function renderCoreLinks(svg, subjectNode, nodes, activeNodeId, connectionVisuals) {
    nodes.forEach((node) => {
      const line = createLine(subjectNode, node, `${buildLinkClass(activeNodeId, ["subject", node.id])} graph-link-core`);
      svg.append(line);
      connectionVisuals.push({ line, sourceId: "subject", targetId: node.id, guide: false, core: true });
    });
  }

  function renderGuideLinks(svg, subjectNode, manualNodes, relations, activeNodeId, connectionVisuals) {
    const linkedNodes = new Set();

    relations.forEach((relation) => {
      linkedNodes.add(relation.sourceId);
      linkedNodes.add(relation.targetId);
    });

    manualNodes
      .filter((node) => !linkedNodes.has(node.id))
      .forEach((node) => {
        const line = createLine(subjectNode, node, `${buildLinkClass(activeNodeId, ["subject", node.id])} graph-link-guide`);
        svg.append(line);
        connectionVisuals.push({ line, sourceId: "subject", targetId: node.id, guide: true, core: false });
      });
  }

  function renderManualRelations(svg, nodeMap, relations, activeNodeId, relationVisuals) {
    relations.forEach((relation) => {
      const sourceNode = nodeMap.get(relation.sourceId);
      const targetNode = nodeMap.get(relation.targetId);

      if (!sourceNode || !targetNode) {
        return;
      }

      const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
      const line = createLine(
        sourceNode,
        targetNode,
        `graph-link graph-link-relation graph-link-${relation.confidence || "medium"}`
      );
      const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
      label.setAttribute("text-anchor", "middle");
      label.setAttribute("class", "graph-relation-label");
      label.textContent = truncate(relation.label || "relazione", 24);

      group.append(line, label);
      svg.append(group);

      relationVisuals.push({
        group,
        line,
        label,
        sourceId: relation.sourceId,
        targetId: relation.targetId,
        confidence: relation.confidence || "medium",
      });

      syncSingleRelationVisual(relationVisuals[relationVisuals.length - 1], nodeMap, activeNodeId);
    });
  }

  function renderNode(svg, node, activeNodeId, nodeVisuals, onNodeSelect, onNodeMove, syncConnections) {
    const ns = "http://www.w3.org/2000/svg";
    const group = document.createElementNS(ns, "g");
    const circle = document.createElementNS(ns, "circle");
    const titleText = document.createElementNS(ns, "text");
    const valueText = document.createElementNS(ns, "text");

    group.setAttribute("class", `graph-node graph-node-${node.kind}${activeNodeId === node.id ? " active" : ""}`);
    circle.setAttribute("r", node.radius);
    circle.setAttribute("fill", node.fill);
    circle.setAttribute("stroke", node.stroke);

    titleText.setAttribute("text-anchor", "middle");
    titleText.setAttribute("class", "node-title");
    titleText.textContent = node.title;

    valueText.setAttribute("text-anchor", "middle");
    valueText.setAttribute("class", "node-value");
    valueText.textContent = node.value;

    group.append(circle, titleText, valueText);
    svg.append(group);

    nodeVisuals.set(node.id, { group, circle, titleText, valueText });
    syncNodeVisual(nodeVisuals.get(node.id), node);
    bindDragBehavior(svg, node, activeNodeId, group, onNodeSelect, onNodeMove, syncConnections);
  }

  function bindDragBehavior(svg, node, activeNodeId, group, onNodeSelect, onNodeMove, syncConnections) {
    group.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      const pointer = toSvgPoint(svg, event);
      const offsetX = pointer.x - node.x;
      const offsetY = pointer.y - node.y;
      const startX = node.x;
      const startY = node.y;
      let moved = false;

      if (typeof group.setPointerCapture === "function") {
        group.setPointerCapture(event.pointerId);
      }

      const handleMove = (moveEvent) => {
        const nextPoint = toSvgPoint(svg, moveEvent);
        const nextX = clamp(nextPoint.x - offsetX, VIEWBOX.padding + node.radius, VIEWBOX.width - VIEWBOX.padding - node.radius);
        const nextY = clamp(nextPoint.y - offsetY, VIEWBOX.padding + node.radius, VIEWBOX.height - VIEWBOX.padding - node.radius);

        if (Math.abs(nextX - startX) > 3 || Math.abs(nextY - startY) > 3) {
          moved = true;
        }

        node.x = nextX;
        node.y = nextY;
        syncConnections();
      };

      const handleEnd = () => {
        window.removeEventListener("pointermove", handleMove);
        window.removeEventListener("pointerup", handleEnd);
        window.removeEventListener("pointercancel", handleEnd);

        if (moved) {
          onNodeMove(node.id, { x: node.x, y: node.y });
          return;
        }

        const nextNodeId = activeNodeId === node.id ? "" : node.id;
        onNodeSelect(nextNodeId);
      };

      window.addEventListener("pointermove", handleMove);
      window.addEventListener("pointerup", handleEnd, { once: true });
      window.addEventListener("pointercancel", handleEnd, { once: true });
    });
  }

  function syncNodeVisual(visual, node) {
    visual.circle.setAttribute("cx", node.x);
    visual.circle.setAttribute("cy", node.y);
    visual.titleText.setAttribute("x", node.x);
    visual.titleText.setAttribute("y", node.y - 3);
    visual.valueText.setAttribute("x", node.x);
    visual.valueText.setAttribute("y", node.y + 18);
  }

  function syncConnections(connectionVisuals, nodeMap, activeNodeId) {
    connectionVisuals.forEach((visual) => {
      const sourceNode = nodeMap.get(visual.sourceId);
      const targetNode = nodeMap.get(visual.targetId);

      if (!sourceNode || !targetNode) {
        return;
      }

      visual.line.setAttribute("x1", sourceNode.x);
      visual.line.setAttribute("y1", sourceNode.y);
      visual.line.setAttribute("x2", targetNode.x);
      visual.line.setAttribute("y2", targetNode.y);
      visual.line.setAttribute(
        "class",
        `${buildLinkClass(activeNodeId, [visual.sourceId, visual.targetId])}${visual.guide ? " graph-link-guide" : ""}${visual.core ? " graph-link-core" : ""}`
      );
    });
  }

  function syncRelationVisuals(relationVisuals, nodeMap, activeNodeId = "") {
    relationVisuals.forEach((visual) => {
      syncSingleRelationVisual(visual, nodeMap, activeNodeId);
    });
  }

  function syncSingleRelationVisual(visual, nodeMap, activeNodeId) {
    const sourceNode = nodeMap.get(visual.sourceId);
    const targetNode = nodeMap.get(visual.targetId);

    if (!sourceNode || !targetNode) {
      return;
    }

    visual.group.setAttribute(
      "class",
      `graph-relation-group${isDimmed(activeNodeId, [visual.sourceId, visual.targetId]) ? " dimmed" : ""}`
    );
    visual.line.setAttribute("x1", sourceNode.x);
    visual.line.setAttribute("y1", sourceNode.y);
    visual.line.setAttribute("x2", targetNode.x);
    visual.line.setAttribute("y2", targetNode.y);

    const midpoint = getLabelPosition(sourceNode, targetNode);
    visual.label.setAttribute("x", midpoint.x);
    visual.label.setAttribute("y", midpoint.y);
  }

  function createLine(sourceNode, targetNode, className) {
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", sourceNode.x);
    line.setAttribute("y1", sourceNode.y);
    line.setAttribute("x2", targetNode.x);
    line.setAttribute("y2", targetNode.y);
    line.setAttribute("class", className);
    return line;
  }

  function buildLinkClass(activeNodeId, relatedIds) {
    return `graph-link${isDimmed(activeNodeId, relatedIds) ? " dimmed" : ""}`;
  }

  function isDimmed(activeNodeId, relatedIds) {
    return Boolean(activeNodeId) && !relatedIds.includes(activeNodeId);
  }

  function getLabelPosition(sourceNode, targetNode) {
    const midpoint = {
      x: (sourceNode.x + targetNode.x) / 2,
      y: (sourceNode.y + targetNode.y) / 2,
    };
    const dx = targetNode.x - sourceNode.x;
    const dy = targetNode.y - sourceNode.y;
    const distance = Math.max(1, Math.hypot(dx, dy));
    const offset = 12;

    return {
      x: midpoint.x + (-dy / distance) * offset,
      y: midpoint.y + (dx / distance) * offset,
    };
  }

  function applySavedPositions(nodes, graphLayout) {
    return nodes.map((node) => applySavedPosition(node, graphLayout));
  }

  function applySavedPosition(node, graphLayout) {
    const stored = graphLayout[node.id];

    if (!stored || typeof stored.x !== "number" || typeof stored.y !== "number") {
      return node;
    }

    return {
      ...node,
      x: stored.x,
      y: stored.y,
    };
  }

  function hasPosition(node) {
    return typeof node.x === "number" && typeof node.y === "number";
  }

  function clampNodePosition(node) {
    if (!hasPosition(node)) {
      return node;
    }

    return {
      ...node,
      x: clamp(node.x, VIEWBOX.padding + node.radius, VIEWBOX.width - VIEWBOX.padding - node.radius),
      y: clamp(node.y, VIEWBOX.padding + node.radius, VIEWBOX.height - VIEWBOX.padding - node.radius),
    };
  }

  function toSvgPoint(svg, event) {
    const rect = svg.getBoundingClientRect();
    const viewBox = svg.viewBox.baseVal;
    const scaleX = viewBox.width / rect.width;
    const scaleY = viewBox.height / rect.height;

    return {
      x: (event.clientX - rect.left) * scaleX + viewBox.x,
      y: (event.clientY - rect.top) * scaleY + viewBox.y,
    };
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  window.OSINT_GRAPH = {
    renderGraph,
  };
})();
