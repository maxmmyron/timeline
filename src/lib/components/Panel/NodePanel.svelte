<script lang="ts">
  import { panelPos } from "$lib/stores";
  import { createEdge } from "$lib/utils";
  import { onMount } from "svelte";
  import { get } from "svelte/store";

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
  let isDrawingTempEdge = false;
  let isRerenderNeeded = false;
  let isMovingEdge = false;

  let tempConnection: App.EdgeVertex<
    (args: any) => Record<string, any>,
    "in" | "out"
  > | null = null;
  let tempOrigin: "in" | "out";

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

  // #region node handling

  const connect = <
    T extends (args: any) => Record<string, any>,
    K extends keyof ReturnType<T>,
    U extends (args: any) => Record<string, any>,
    V extends keyof Parameters<U>[0],
  >(
    nodeA: App.EditorNode<T>,
    keyA: K,
    nodeB: App.EditorNode<U>,
    keyB: V
  ) => {
    // if there exists an edge from nodeA/keyA -> nodeB/keyB, return
    if (
      filterGraph.edges.find(
        ({ outVertex, inVertex }) =>
          outVertex.node === nodeA &&
          outVertex.key === keyA &&
          inVertex.node === nodeB &&
          inVertex.key === keyB
      )
    ) {
      return;
    }

    const edge = createEdge(
      { node: nodeA, key: keyA.toString() },
      { node: nodeB, key: keyB }
    );

    filterGraph.edges = [...filterGraph.edges, edge];
    tempConnection = null;
  };

  const disconnect = <
    T extends (args: any) => Record<string, any>,
    K extends keyof ReturnType<T>,
    U extends (args: any) => Record<string, any>,
    V extends keyof Parameters<U>[0],
  >(
    nodeA: App.EditorNode<T>,
    keyA: K,
    nodeB: App.EditorNode<U>,
    keyB: V
  ) => {
    const edge = filterGraph.edges.find(
      ({ outVertex, inVertex }) =>
        outVertex.node === nodeA &&
        outVertex.key === keyA &&
        inVertex.node === nodeB &&
        inVertex.key === keyB
    );

    // if an edge exists, call the unsubscribe method and remove it from the graph.
    if (edge) {
      edge.unsubscribe();
      filterGraph.edges = filterGraph.edges.filter((e) => e !== edge);
    }
  };

  const disconnectConnection = (connection: App.GraphEdge) => {
    disconnect(
      connection.outVertex.node,
      connection.outVertex.key.toString(),
      connection.inVertex.node,
      connection.inVertex.key
    );
  };

  /**
   * Starts a new temporary edge from an input element.
   *
   * If the input elements already has a connection (which is passed in via the connection param),
   * then that connection is removed and replaced with a phantom edge starting from the removed connection's *output.*
   * @param node
   * @param key
   * @param connection
   */
  const startPhantomEdge = (
    side: "in" | "out",
    node: App.EditorNode<(args: any) => Record<string, any>>,
    key: string,
    connection: App.GraphEdge | undefined
  ) => {
    let oppositeVertex:
      | App.EdgeVertex<
          (args: any) => Record<string, any>,
          typeof side extends "out" ? "in" : "out"
        >
      | undefined;

    if (side === "in") {
      oppositeVertex = connection?.outVertex;
    } else {
      oppositeVertex = connection?.inVertex;
    }

    if (oppositeVertex) {
      tempOrigin = side === "in" ? "out" : "in";
      tempConnection = {
        node: oppositeVertex.node,
        key: oppositeVertex.key,
      };
      isDrawingTempEdge = true;
    } else {
      tempOrigin = side;
      tempConnection = { node, key };
      isDrawingTempEdge = true;
    }
  };

  /**
   * Ends a phantom edge and adds it as an edge to the filter graph.
   *
   * If the end vertex has an edge connected to it, then disconnect it.
   */
  const endPhantomEdge = (
    side: "in" | "out",
    node: App.EditorNode<(args: any) => Record<string, any>>,
    key: string,
    connection: App.GraphEdge | undefined
  ) => {
    // if there doesn't exist a temporary connection, break early
    if (!tempConnection) return;
    // if we're connection to same side that we started from, break early
    if (tempOrigin === side) return;
    // if we're attempting to connect to the same node, break early
    if (tempConnection.node.uuid === node.uuid) return;

    // if there exists a connection *and* the origin is from an out vertex
    // (i.e. passed-in connection is for an in-vertex), then remove the
    // connection
    if (connection && tempOrigin == "out") {
      disconnectConnection(connection);
    }

    if (tempOrigin === "out") {
      connect(tempConnection.node, tempConnection.key.toString(), node, key);
    } else {
      connect(node, key, tempConnection.node, tempConnection.key.toString());
    }
  };

  // #region canvas

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

      if (isDrawingTempEdge) {
        drawTempEdge(...mousePos);
      }

      isRerenderNeeded = false;
    }
  };

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

  const drawTempEdge = (x: number, y: number) => {
    if (!tempConnection) return;

    let ref = refs[tempConnection.node.uuid];
    let vertexEl;
    let query;

    if (tempOrigin === "out") {
      query = `#output-${String(tempConnection.key)}`;
    } else {
      query = `#input-${String(tempConnection.key)}`;
    }
    vertexEl = ref.querySelector(query);

    if (!vertexEl)
      throw new Error(
        `Error drawing edge: ${query} does not exist on node ${tempConnection.node.uuid}`
      );

    let { left, top } = canvas.getBoundingClientRect();

    ctx.lineWidth = 2;
    ctx.strokeStyle = "orange";

    let outX: number, outY: number, inX: number, inY: number;

    if (tempOrigin === "out") {
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

    if (tempOrigin === "out") {
      ctx.bezierCurveTo(outX + control, outY, inX - mControl, inY, inX, inY);
    } else {
      ctx.bezierCurveTo(outX + mControl, outY, inX - control, inY, inX, inY);
    }

    ctx.stroke();
  };

  const handleMove = (x: number, y: number) => {
    isRerenderNeeded = true;
    if (isDrawingTempEdge) mousePos = [x, y];
    if (isMovingCanvas) moveCanvas(x, y);
  };

  // #region util
  const getConnections = (
    inConnection: App.EdgeVertex<
      (args: any) => Record<string, any>,
      "in"
    > | null = null,
    outConnection: App.EdgeVertex<
      (args: any) => Record<string, any>,
      "out"
    > | null = null
  ) => {
    if (inConnection && !outConnection) {
      return filterGraph.edges.filter(
        ({ inVertex }) =>
          inVertex.node === inConnection.node &&
          inVertex.key === inConnection.key
      );
    } else if (!inConnection && outConnection) {
      return filterGraph.edges.filter(
        ({ inVertex }) =>
          inVertex.node === outConnection.node &&
          inVertex.key === outConnection.key
      );
    } else if (inConnection && outConnection) {
      return filterGraph.edges.filter(
        ({ inVertex, outVertex }) =>
          inVertex.node === inConnection.node &&
          inVertex.key === inConnection.key &&
          outVertex.node === outConnection.node &&
          outVertex.key === outConnection.key
      );
    }

    return [];
  };
</script>

<svelte:window
  on:mouseup={() => (isMovingCanvas = false)}
  on:touchend={() => (isMovingCanvas = false)}
  on:touchmove={(e) => handleMove(e.touches[0].clientX, e.touches[0].clientY)}
  on:mousemove={(e) => handleMove(e.clientX, e.clientY)}
  on:mouseup={(e) => {
    isDrawingTempEdge = false;
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
    {@const pos = node.pos}
    {@const __inputs = get(node.inputs)}
    {@const __outputs = get(node.outputs)}
    <div
      class="absolute border border-black rounded-md flex flex-col p-1 min-w-52"
      style="left: {pos[0] + $panelPos[0]}px; top: {pos[1] + $panelPos[1]}px;"
      bind:this={refs[uuid]}
    >
      <header class="border-b">
        <p class="text-center">{node.uuid}</p>
      </header>
      <main class="flex">
        {#if __inputs}
          <ul class="relative -left-1">
            {#each Object.entries(__inputs) as [key, val]}
              {@const connections = getConnections({ node, key }, null)}
              <li class="flex items-center gap-1">
                <button
                  on:mousedown|stopPropagation={() =>
                    startPhantomEdge("in", node, key, connections[0])}
                  on:touchstart|stopPropagation={() =>
                    startPhantomEdge("in", node, key, connections[0])}
                  on:mouseup={() => {
                    if (tempOrigin === "out") {
                      endPhantomEdge("in", node, key, connections[0]);
                    }
                  }}
                  on:touchend={() => {
                    if (tempOrigin === "out") {
                      endPhantomEdge("in", node, key, connections[0]);
                    }
                  }}
                  class="w-[9px] h-[9px] rounded-full bg-blue-400 border border-blue-400/25 input"
                  id="input-{key}"
                ></button>
                <p>{key}</p>
                {#if connections.length === 0}
                  <input
                    type="range"
                    on:input={(e) => {
                      const newValue = e.currentTarget.valueAsNumber;
                      node.inputs.set({ ...__inputs, [key]: newValue });
                    }}
                  />
                {/if}
              </li>
            {/each}
          </ul>
        {/if}
        <div class="flex-grow"></div>
        {#if __outputs}
          <ul class="relative -right-1">
            {#each Object.entries(__outputs) as [key, value] (node.uuid + key)}
              {@const connections = getConnections(null, { node, key })}
              <li class="flex items-center gap-1">
                <p>{key}</p>
                <!-- If there are *no* inputs on this node, then render an input
              value to modify the output (since it can't be transformed by some
              function) TODO: very temporary behavior! -->
                {#if !__inputs}
                  <input
                    type="range"
                    on:input={(e) => {
                      const newValue = e.currentTarget.valueAsNumber;
                      node.outputs.set({ ...__outputs, [key]: newValue });
                    }}
                  />
                {/if}
                <!-- TODO: add listed nodes -->
                <button
                  on:mousedown|stopPropagation={() =>
                    startPhantomEdge("out", node, key, undefined)}
                  on:touchstart|stopPropagation={() =>
                    startPhantomEdge("out", node, key, undefined)}
                  on:mouseup={() => {
                    if (tempOrigin === "in") {
                      endPhantomEdge("out", node, key, undefined);
                    }
                  }}
                  on:touchend={() => {
                    if (tempOrigin === "in") {
                      endPhantomEdge("out", node, key, undefined);
                    }
                  }}
                  class="w-[9px] h-[9px] rounded-full bg-blue-400 border border-blue-400/25 input"
                  id="output-{key}"
                ></button>
              </li>
            {/each}
          </ul>
        {/if}
      </main>
    </div>
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
