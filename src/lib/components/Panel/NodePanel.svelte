<script lang="ts">
  import Node from "./NodeEditor/Node.svelte";
  import { panelConnections, panelPos } from "$lib/stores";
  import { beforeUpdate, onMount } from "svelte";

  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D;

  export let current: App.VideoClip | App.AudioClip | App.ImageClip;

  let moving: boolean = false;
  let initMouse: [number, number] = [0, 0];
  let initPos: [number, number] = [0, 0];

  let refs: Record<string, HTMLElement> = {};
  let inputs: Record<string, { [key: string]: any }> = {};
  let outputs: Record<string, { [key: string]: any }> = {};

  // before we update the component, we need to go through each node and ensure its inputs and outputs are recorded in the relevant records!
  beforeUpdate(() => {
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
    requestAnimationFrame(frame);

    return () => {
      window.removeEventListener("resize", resize);
      panelPos.set([0, 0], { hard: true });
      $panelConnections = {};
    };
  });

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
  let startEdgeNode: App.EditorNode<(...args: any) => any>;
  let startEdgeVertex: keyof Parameters<(typeof startEdgeNode)["transform"]>[0];
  let isDrawingNewEdge = false;
  let isDrawingFromOutput = true;

  const frame = (timestamp: DOMHighResTimeStamp) => {
    requestAnimationFrame(frame);

    if (isRerenderNeeded) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawEdges();
      isRerenderNeeded = false;
    }
  };

  const drawEdges = () => {
    for (const [outUUID, outData] of Object.entries($panelConnections)) {
      if (JSON.stringify(outData) === "{}") continue;
      const outVertexName = Object.keys(outData)[0];
      const [inUUID, inVertexName] = [
        outData[outVertexName].uuid,
        outData[outVertexName].in,
      ];

      drawEdge(outUUID, outVertexName, inUUID, inVertexName);
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
    let ref = refs[startEdgeNode.uuid];
    let vertexEl;
    if (isDrawingFromOutput) {
      vertexEl = ref.querySelector(`#output-${String(startEdgeVertex)}`);
    } else {
      vertexEl = ref.querySelector(`#input-${String(startEdgeVertex)}`);
    }

    if (!vertexEl)
      throw new Error(
        `Error drawing edge: vertex with name ${String(startEdgeVertex)} does not exist on node ${startEdgeNode.uuid}`
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
            inputs[input.uuid][input.in] = e.detail[outputName];
          }
        }}
        on:startedge={(e) => {
          if (typeof e.detail.node === "string") {
            const node = current.nodes.find((n) => n.uuid === e.detail.node);
            if (!node) {
              throw new Error(`No node with uuid ${e.detail.node} found.`);
            }
            startEdgeNode = node;
          } else {
            startEdgeNode = e.detail.node;
          }

          isDrawingNewEdge = true;
          startEdgeVertex = e.detail.vertex;
          isDrawingFromOutput = e.detail.isOutputVertex;
        }}
        on:endedge={(e) => {
          if (!isDrawingNewEdge) return;

          const uuid =
            typeof e.detail.node === "string"
              ? e.detail.node
              : e.detail.node.uuid;

          let node;
          if (e.detail.isOutputVertex) {
            node = current.nodes.find((n) => n.uuid === uuid);
          } else {
            node = current.nodes.find((n) => n.uuid === startEdgeNode.uuid);
          }

          if (!node) throw new Error(`No node found.`);

          if (e.detail.isOutputVertex) {
            node.connectionsOut[e.detail.vertex.toString()] = {
              uuid: startEdgeNode.uuid,
              in: startEdgeVertex.toString(),
            };
          } else {
            node.connectionsOut[startEdgeVertex.toString()] = {
              uuid,
              in: e.detail.vertex.toString(),
            };
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

<canvas
  bind:this={canvas}
  class="pointer-events-none absolute -top-1 -left-1 w-[calc(100%_+_.5rem)] h-[calc(100%_+_.5rem)]"
></canvas>

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
