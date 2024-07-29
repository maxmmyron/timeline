<script lang="ts">
  import Node from "./NodeEditor/Node.svelte";
  import { panelPos } from "$lib/stores";
  import { beforeUpdate, onMount } from "svelte";
  import { invalidate } from "$app/navigation";

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

  let frameID: number;

  let isMovingCanvas = false;
  let isDrawingNewEdge = false;
  let isRerenderNeeded = false;

  $: filterGraph = current.filterGraph;

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

    // we've recalculated UUID changes, so request a rerender and start the render cycle
    isRerenderNeeded = true;
    frameID = requestAnimationFrame(frame);

    // on dismount, we want to reset panel settings, stop any render cycles, and reset the connections
    return () => {
      window.removeEventListener("resize", resize);
      panelPos.set([0, 0], { hard: true });
      cancelAnimationFrame(frameID);
    };
  });

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

  let initNode: App.EditorNode<(args: any) => Record<string, any>>;
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

      for (const { outVertex, inVertex } of filterGraph.edges) {
        drawEdge(
          outVertex.node.uuid,
          outVertex.key.toString(),
          inVertex.node.uuid,
          inVertex.key.toString()
        );
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

  {#each filterGraph.nodes as node}
    {@const uuid = node.uuid}
    {#key node.uuid}
      <Node
        {node}
        bind:ref={refs[node.uuid]}
        on:startedge={(e) => {
          // get the node
          if (typeof e.detail.node === "string") {
            const node = filterGraph.nodes.find(
              (n) => n.uuid === e.detail.node
            );
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
          const termNode = filterGraph.nodes.find((n) => n.uuid === eventUUID);
          const termVertex = e.detail.vertex.toString();

          if (!termNode) throw new Error("Could not find node");

          if (initVertexType === "out") {
            connectNodes(initNode, initVertex, termNode, termVertex);
          } else {
            connectNodes(termNode, termVertex, initNode, initVertex.toString());
          }

          isRerenderNeeded = true;
        }}
        on:nodemove={(e) => {
          // TODO: only rerender iff moved node has connections
          isRerenderNeeded = true;
        }}
      />
    {/key}
  {/each}
</div>

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
