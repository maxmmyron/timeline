<script lang="ts">
  import Node from "./NodeEditor/Node.svelte";
  import { panelPos, nodeInConnections, nodeOutConnections } from "$lib/stores";
  import { beforeUpdate, onMount } from "svelte";
  import { connectNodes } from "$lib/utils";

  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D;

  export let current: App.VideoClip | App.AudioClip | App.ImageClip;

  let initMouse: [number, number] = [0, 0];
  let initPos: [number, number] = [0, 0];
  let mousePos: [number, number] = [0, 0];

  /**
   * Stores refs for existing node elements.
   * Used when drawing connections
   */
  let refs: Record<string, HTMLElement> = {};

  /**
   * A record of node UUIDs and key/value pairs. Used to trigger transform function reactively.
   */
  let inputs: Record<string, { [key: string]: any }> = {};

  /**
   * A record of node UUIDs and key/value pairs. Used to trigger transform function reactively.
   */
  let outputs: Record<string, { [key: string]: any }> = {};

  /**
   * A record of node UUIDs and key/value pairs. Used to track and store internal outputs of nodes.
   */
  let internalOutputs: Record<string, { [key: string]: any }> = {};

  let frameID: number;

  let isMovingCanvas = false;
  let isMounted = false;
  let isDrawingNewEdge = false;
  let isRerenderNeeded = false;

  // before we update the component, we need to go through each node and ensure its inputs and outputs are recorded in the relevant records!
  beforeUpdate(() => {
    recalcPanelConnections();

    if (!isMounted) {
      for (const node of current.nodes) {
        if (!inputs[node.uuid]) inputs[node.uuid] = node.in;
        if (!outputs[node.uuid]) outputs[node.uuid] = node.out;
      }
    }
  });

  onMount(() => {
    // setup canvas settings on mount
    ctx = canvas.getContext("2d") as CanvasRenderingContext2D;

    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;

    const resize = () => {
      canvas.width = canvas.clientWidth;
      canvas.height = canvas.clientHeight;
    };

    window.addEventListener("resize", resize);

    // recalc panel connections since we remount when current UUID changes
    recalcPanelConnections();

    // we've recalculated UUID changes, so request a rerender and start the render cycle
    isRerenderNeeded = true;
    frameID = requestAnimationFrame(frame);

    isMounted = true;

    // on dismount, we want to reset panel settings, stop any render cycles, and reset the connections
    return () => {
      window.removeEventListener("resize", resize);
      panelPos.set([0, 0], { hard: true });
      cancelAnimationFrame(frameID);
      $nodeOutConnections = {};
      $nodeInConnections = {};
    };
  });

  const recalcPanelConnections = () => {
    for (const node of current.nodes) {
      $nodeOutConnections[node.uuid] = node.connectionsOut;
      $nodeInConnections[node.uuid] = node.connectionsIn;
    }
  };

  const startCanvasMove = (x: number, y: number) => {
    isMovingCanvas = true;
    initPos = [$panelPos[0], $panelPos[1]];
    initMouse = [x, y];
  };

  const moveCanvas = (x: number, y: number) => {
    let newPos: [number, number] = [
      x - initMouse[0] + initPos[0],
      y - initMouse[1] + initPos[1],
    ];

    panelPos.set(newPos, { hard: true });
  };

  // ---------------------
  // Drawing
  // ---------------------

  let initNode: App.EditorNode<(...args: any) => any>;
  let initVertex: keyof Parameters<(typeof initNode)["transform"]>[0];
  /**
   * The type of vertex that received the "mousedown" event
   */
  let initVertexType: "in" | "out";

  const frame = (timestamp: DOMHighResTimeStamp) => {
    frameID = requestAnimationFrame(frame);

    // break early (helps during remounts)
    // TODO: remove this when better fix
    if (!canvas) return;

    if (isRerenderNeeded) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      $outer: for (const [uuid, outer] of Object.entries($nodeOutConnections)) {
        for (const [vertex, inner] of Object.entries(outer)) {
          if (inner === null) continue $outer;
          drawEdge(uuid, vertex, ...inner);
        }
      }

      if (isDrawingNewEdge) {
        drawNewEdge(...mousePos);
      }

      isRerenderNeeded = false;
    }
  };

  /**
   *
   * Draws the edge between two node input/outputs
   */
  const drawEdge = (
    outUUID: string,
    outVertex: string,
    inUUID: string,
    inVertex: string
  ) => {
    let outRef = refs[outUUID];
    if (!outRef) return;
    let outVertexEl = outRef.querySelector(`#output-${String(outVertex)}`);

    let inRef = refs[inUUID];
    if (!inRef) return;
    let inVertexEl = inRef.querySelector(`#input-${String(inVertex)}`);

    if (!outVertexEl || !inVertexEl) {
      throw new Error("Error drawing edge: Cannot find vertex element");
    }

    let { left, top } = canvas.getBoundingClientRect();

    ctx.lineWidth = 2;
    ctx.strokeStyle = "orange";

    let [outX, outY] = [
      outVertexEl.getBoundingClientRect().left + 4.5 - left,
      outVertexEl.getBoundingClientRect().top + 4.5 - top,
    ];
    let [inX, inY] = [
      inVertexEl.getBoundingClientRect().left + 4.5 - left,
      inVertexEl.getBoundingClientRect().top + 4.5 - top,
    ];
    let horzDist = Math.abs((inX - outX) * 0.35);

    ctx.beginPath();
    ctx.moveTo(outX, outY);
    ctx.bezierCurveTo(outX + horzDist, outY, inX - horzDist, inY, inX, inY);
    ctx.stroke();
  };

  /**
   * Draws an edge that connects to the mouse cursor/touch target.
   *
   * @param pos
   */
  const drawNewEdge = (x: number, y: number) => {
    let ref = refs[initNode.uuid];
    let vertexEl;
    let query;

    if (initVertexType === "out") {
      query = `#output-${String(initVertex)}`;
    } else {
      query = `#input-${String(initVertex)}`;
    }
    vertexEl = ref.querySelector(query);

    if (!vertexEl)
      throw new Error(
        `Error drawing edge: ${query} does not exist on node ${initNode.uuid}`
      );

    let { left, top } = canvas.getBoundingClientRect();

    ctx.lineWidth = 2;
    ctx.strokeStyle = "orange";

    let outX: number, outY: number, inX: number, inY: number;

    if (initVertexType === "out") {
      [outX, outY] = [
        vertexEl.getBoundingClientRect().left + 4.5 - left,
        vertexEl.getBoundingClientRect().top + 4.5 - top,
      ];
      [inX, inY] = [x - left, y - top];
    } else {
      [outX, outY] = [x - left, y - top];
      [inX, inY] = [
        vertexEl.getBoundingClientRect().left + 4.5 - left,
        vertexEl.getBoundingClientRect().top + 4.5 - top,
      ];
    }

    let control = Math.abs((inX - outX) * 0.35);

    /**
     * We don't want mouse's control point to "snap ahead" of mouse if mouse x is behind/ahead other node
     */
    let mControl = (inX - outX) * 0.35;

    ctx.beginPath();
    ctx.moveTo(outX, outY);

    if (initVertexType === "out") {
      ctx.bezierCurveTo(outX + control, outY, inX - mControl, inY, inX, inY);
    } else {
      ctx.bezierCurveTo(outX + mControl, outY, inX - control, inY, inX, inY);
    }

    ctx.stroke();
  };

  const handleMove = (x: number, y: number) => {
    isRerenderNeeded = true;
    if (isDrawingNewEdge) mousePos = [x, y];
    if (isMovingCanvas) moveCanvas(x, y);
  };
</script>

<svelte:window
  on:mouseup={() => (isMovingCanvas = false)}
  on:touchend={() => (isMovingCanvas = false)}
  on:touchmove={(e) => handleMove(e.touches[0].clientX, e.touches[0].clientY)}
  on:mousemove={(e) => handleMove(e.clientX, e.clientY)}
  on:mouseup={(e) => {
    isDrawingNewEdge = false;
    isRerenderNeeded = true;
  }}
/>

<div
  on:dblclick={() => panelPos.set([0, 0])}
  on:mousedown={(e) => startCanvasMove(e.clientX, e.clientY)}
  on:touchstart={(e) =>
    startCanvasMove(e.touches[0].clientX, e.touches[0].clientY)}
  role="grid"
  tabindex="0"
  class="relative bg-dot -top-1 -left-1 w-[calc(100%_+_.5rem)] h-[calc(100%_+_.5rem)] from-zinc-925 from-25% to-zinc-950 to-25%"
  style="background-position: {$panelPos[0] % 8}px {$panelPos[1] % 8}px"
>
  <canvas
    bind:this={canvas}
    class="pointer-events-none absolute -top-1 -left-1 w-[calc(100%_+_.5rem)] h-[calc(100%_+_.5rem)]"
  ></canvas>

  {#each current.nodes as node}
    {@const uuid = node.uuid}
    {#key node.uuid}
      <Node
        {node}
        bind:ref={refs[node.uuid]}
        bind:inputs={inputs[uuid]}
        bind:outputs={outputs[uuid]}
        bind:internalOutputs={internalOutputs[uuid]}
        on:transform={(e) => {
          for (const [outputName, input] of Object.entries(
            node.connectionsOut
          )) {
            if (!input) continue;
            inputs[input[0]][input[1]] = e.detail[0][outputName];
          }
        }}
        on:startedge={(e) => {
          // get the node
          if (typeof e.detail.node === "string") {
            const node = current.nodes.find((n) => n.uuid === e.detail.node);
            if (!node) {
              throw new Error(`No node with uuid ${e.detail.node} found.`);
            }
            initNode = node;
          } else {
            initNode = e.detail.node;
          }

          // start drawing a new edge from this vertex
          isDrawingNewEdge = true;
          initVertex = e.detail.vertex;
          initVertexType = e.detail.vertexType;

          recalcPanelConnections();
        }}
        on:endedge={(e) => {
          if (!isDrawingNewEdge) return;

          // if we're trying to connect two like vertex type (like in -> in or out -> out) then break early.
          if (e.detail.vertexType === initVertexType) {
            return;
          }

          let eventUUID;
          if (typeof e.detail.node === "string") {
            eventUUID = e.detail.node;
          } else {
            eventUUID = e.detail.node.uuid;
          }

          // if we're attempting to draw to the same node, then break early!
          if (eventUUID === initNode.uuid) {
            return;
          }

          // get terminal node/vertex pair
          const termNode = current.nodes.find((n) => n.uuid === eventUUID);
          const termVertex = e.detail.vertex.toString();

          if (!termNode) throw new Error("Could not find node");

          if (initVertexType === "out") {
            connectNodes(initNode, initVertex, termNode, termVertex);
          } else {
            connectNodes(termNode, termVertex, initNode, initVertex.toString());
          }

          isRerenderNeeded = true;

          recalcPanelConnections();
        }}
        on:nodemove={(e) => {
          // TODO: only rerender iff moved node has connections
          isRerenderNeeded = true;
        }}
      />
    {/key}
  {/each}
</div>

<button
  class="absolute bottom-1 right-1 border border-zinc-900 bg-zinc-925 rounded-sm px-2 py-1 uppercase"
  on:click={() => {
    console.log($nodeOutConnections);
    console.log($nodeInConnections);
  }}>LOG</button
>

<style>
  .bg-dot {
    background-image: radial-gradient(
      circle at 4px 4px,
      var(--tw-gradient-from),
      var(--tw-gradient-to)
    );
    background-size: 8px 8px;
  }
</style>
