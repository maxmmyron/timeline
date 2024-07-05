<script lang="ts">
  import Node from "./NodeEditor/Node.svelte";
  import { panelPos, nodeInConnections, nodeOutConnections } from "$lib/stores";
  import { beforeUpdate, onMount } from "svelte";
  import { connectNodes } from "$lib/utils";

  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D;

  export let current: App.VideoClip | App.AudioClip | App.ImageClip;

  let moving: boolean = false;
  let initMouse: [number, number] = [0, 0];
  let initPos: [number, number] = [0, 0];

  let refs: Record<string, HTMLElement> = {};

  // TODO: remove these
  let inputs: Record<string, { [key: string]: any }> = {};
  let outputs: Record<string, { [key: string]: any }> = {};

  let frameID: number;

  // before we update the component, we need to go through each node and ensure its inputs and outputs are recorded in the relevant records!
  beforeUpdate(() => {
    recalcPanelConnections();

    for (const node of current.nodes) {
      if (!inputs[node.uuid]) inputs[node.uuid] = node.in;
      if (!outputs[node.uuid]) outputs[node.uuid] = node.out;
    }
  });

  onMount(() => {
    ctx = canvas.getContext("2d") as CanvasRenderingContext2D;

    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;

    const resize = () => {
      canvas.width = canvas.clientWidth;
      canvas.height = canvas.clientHeight;
    };

    window.addEventListener("resize", resize);

    isRerenderNeeded = true;
    frameID = requestAnimationFrame(frame);
    recalcPanelConnections();

    return () => {
      window.removeEventListener("resize", resize);
      panelPos.set([0, 0], { hard: true });
      cancelAnimationFrame(frameID);
    };
  });

  const recalcPanelConnections = () => {
    for (const node of current.nodes) {
      $nodeOutConnections[node.uuid] = node.connectionsOut;
      $nodeInConnections[node.uuid] = node.connectionsIn;
    }
  };

  const startMove = (x: number, y: number) => {
    moving = true;
    initPos = [$panelPos[0], $panelPos[1]];
    initMouse = [x, y];
  };

  const move = (x: number, y: number) => {
    if (!moving) return;

    let newPos: [number, number] = [
      x - initMouse[0] + initPos[0],
      y - initMouse[1] + initPos[1],
    ];

    panelPos.set(newPos, { hard: true });

    isRerenderNeeded = true;
  };

  // ---------------------
  // Drawing
  // ---------------------

  let isRerenderNeeded = false;
  let isDrawingNewEdge = false;

  /**
   * The type of vertex that received the "mousedown" event
   */
  let initialVertexType: "in" | "out";
  let initialEdgeNode: App.EditorNode<(...args: any) => any>;
  let initialEdgeVertex: keyof Parameters<
    (typeof initialEdgeNode)["transform"]
  >[0];
  /**
   * The type of vertex that receive the "mouseup" event
   */
  let finalVertexType: "in" | "out";

  const frame = (timestamp: DOMHighResTimeStamp) => {
    frameID = requestAnimationFrame(frame);

    // break early (helps during remounts)
    // TODO: remove this when better fix
    if (!canvas) return;

    if (isRerenderNeeded) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      $outer: for (const [oUUID, oData] of Object.entries(
        $nodeOutConnections
      )) {
        for (const [vertex, data] of Object.entries(oData)) {
          if (data === null) continue $outer;
          drawEdge(oUUID, vertex, ...data);
        }
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
    let outVertexEl = outRef.querySelector(`#output-${String(outVertex)}`);

    let inRef = refs[inUUID];
    let inVertexEl = inRef.querySelector(`#input-${String(inVertex)}`);

    if (!outVertexEl || !inVertexEl)
      throw new Error("Error drawing edge: Cannot find vertex element");

    let { left, top } = canvas.getBoundingClientRect();

    ctx.lineWidth = 2;
    ctx.strokeStyle = "orange";

    ctx.beginPath();

    ctx.moveTo(
      outVertexEl.getBoundingClientRect().left + 4.5 - left,
      outVertexEl.getBoundingClientRect().top + 4.5 - top
    );
    ctx.lineTo(
      inVertexEl.getBoundingClientRect().left + 4.5 - left,
      inVertexEl.getBoundingClientRect().top + 4.5 - top
    );

    ctx.stroke();
  };

  /**
   * Draws an edge that connects to the mouse cursor/touch target.
   *
   * @param pos
   */
  const drawNewEdge = (x: number, y: number) => {
    let ref = refs[initialEdgeNode.uuid];
    let vertexEl;
    let query;
    if (initialVertexType === "out") {
      query = `#output-${String(initialEdgeVertex)}`;
    } else {
      query = `#input-${String(initialEdgeVertex)}`;
    }
    vertexEl = ref.querySelector(query);

    console.log(
      query,
      JSON.stringify($nodeOutConnections),
      initialEdgeNode.uuid
    );

    if (!vertexEl)
      throw new Error(
        `Error drawing edge: ${query} does not exist on node ${initialEdgeNode.uuid}`
      );

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    let { left, top } = canvas.getBoundingClientRect();

    ctx.lineWidth = 2;
    ctx.strokeStyle = "orange";

    ctx.beginPath();
    ctx.moveTo(
      vertexEl.getBoundingClientRect().left + 4.5 - left,
      vertexEl.getBoundingClientRect().top + 4.5 - top
    );

    ctx.lineTo(x - left, y - top);
    ctx.stroke();
  };
</script>

<svelte:window
  on:mouseup={() => (moving = false)}
  on:touchend={() => (moving = false)}
  on:touchmove={(e) => {
    if (isDrawingNewEdge)
      drawNewEdge(e.touches[0].clientX, e.touches[0].clientY);
    move(e.touches[0].clientX, e.touches[0].clientY);
  }}
  on:mousemove={(e) => {
    if (isDrawingNewEdge) drawNewEdge(e.clientX, e.clientY);
    move(e.clientX, e.clientY);
  }}
  on:mouseup={(e) => {
    isDrawingNewEdge = false;
    isRerenderNeeded = true;
  }}
/>

<div
  on:dblclick={() => panelPos.set([0, 0])}
  on:mousedown={(e) => startMove(e.clientX, e.clientY)}
  on:touchstart={(e) => startMove(e.touches[0].clientX, e.touches[0].clientY)}
  role="grid"
  tabindex="0"
  class="relative bg-dot -top-1 -left-1 w-[calc(100%_+_.5rem)] h-[calc(100%_+_.5rem)] from-zinc-925 from-25% to-zinc-950 to-25%"
  style="background-position: {$panelPos[0] % 8}px {$panelPos[1] % 8}px"
>
  {#each current.nodes as node}
    {@const uuid = node.uuid}
    {#key node.uuid}
      <Node
        {node}
        bind:ref={refs[node.uuid]}
        bind:inputs={inputs[uuid]}
        bind:outputs={outputs[uuid]}
        on:transform={(e) => {
          for (const [outputName, input] of Object.entries(
            node.connectionsOut
          )) {
            if (!input) continue;
            inputs[input[0]][input[1]] = e.detail[outputName];
          }
        }}
        on:startedge={(e) => {
          // get the node
          if (typeof e.detail.node === "string") {
            const node = current.nodes.find((n) => n.uuid === e.detail.node);
            if (!node) {
              throw new Error(`No node with uuid ${e.detail.node} found.`);
            }
            initialEdgeNode = node;
          } else {
            initialEdgeNode = e.detail.node;
          }

          // start drawing a new edge from this vertex
          isDrawingNewEdge = true;
          initialEdgeVertex = e.detail.vertex;
          initialVertexType = e.detail.vertexType;

          recalcPanelConnections();
        }}
        on:endedge={(e) => {
          if (!isDrawingNewEdge) return;

          // if we're trying to connect two like vertex type (like in -> in or out -> out) then break early.
          if (e.detail.vertexType === initialVertexType) {
            return;
          }

          const uuid =
            typeof e.detail.node === "string"
              ? e.detail.node
              : e.detail.node.uuid;

          // if we're attempting to draw to the same node, then break early!
          if (uuid === initialEdgeNode.uuid) {
            return;
          }

          const endNode = current.nodes.find((n) => n.uuid === uuid);
          if (!endNode) throw new Error("Could not find node");

          console.log(
            `connect ${initialEdgeNode.uuid}:${initialEdgeVertex} to ${uuid}:${e.detail.vertex}`
          );

          connectNodes(
            initialEdgeNode,
            initialEdgeVertex,
            endNode,
            e.detail.vertex.toString()
          );

          finalVertexType = e.detail.vertexType;
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

<canvas
  bind:this={canvas}
  class="pointer-events-none absolute -top-1 -left-1 w-[calc(100%_+_.5rem)] h-[calc(100%_+_.5rem)]"
></canvas>

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
