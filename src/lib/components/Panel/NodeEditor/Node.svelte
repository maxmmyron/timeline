<script lang="ts" context="module">
  /**
   * True if any existing node is currently hovered over.
   */
  let hovering: boolean = false;
  let isDrawingNewEdge: boolean = false;
</script>

<script lang="ts" generics="T extends (...args: any) => any">
  import { createEventDispatcher, onMount } from "svelte";
  import { selectedNodeUUID, panelPos, panelConnections } from "$lib/stores";
  import { getVertexConnection } from "$lib/utils";

  export let node: App.EditorNode<T>;
  export let inputs: Parameters<typeof transform>[0];
  export let outputs: ReturnType<typeof transform>;

  export let ref: HTMLElement;
  let initMouse: [number, number] = [0, 0];
  let initPos: [number, number] = [0, 0];

  let pos: [number, number] = node.pos;
  const { uuid, title, transform } = node;

  const dispatch = createEventDispatcher<{
    transform: ReturnType<typeof transform>;
    startedge: {
      isOutputVertex: boolean;
      node: App.EditorNode<T> | string;
      vertex:
        | keyof ReturnType<typeof transform>
        | keyof Parameters<typeof transform>[0];
    };
    endedge: {
      isOutputVertex: boolean;
      node: App.EditorNode<T> | string;
      vertex:
        | keyof ReturnType<typeof transform>
        | keyof Parameters<typeof transform>[0];
    };
    nodemove: {};
  }>();

  // accept input arg to keep reactivity
  const transformWrapper = (_i: typeof inputs) => {
    console.log(`running transform of ${title}`);
    return transform(_i);
  };

  // run transform & dispatcher when output changes
  $: outputs = transformWrapper(inputs);
  $: if (typeof outputs === "object") dispatch("transform", outputs);

  let isMoving = false;

  onMount(() => {
    for (const [out, inNode] of Object.entries(node.connectionsOut)) {
      if (!inNode) return;
      // if there exists
      if (!Object.keys($panelConnections).find((u) => u === node.uuid)) {
        $panelConnections[node.uuid] = {};
      }
      $panelConnections[node.uuid][out] = {
        ...inNode,
      };
    }
  });

  const initMoveNode = (x: number, y: number) => {
    isMoving = true;
    initPos = pos;
    initMouse = [x, y];
  };

  const moveNode = (x: number, y: number) => {
    if (!isMoving) return;

    pos = [x - initMouse[0] + initPos[0], y - initMouse[1] + initPos[1]];

    dispatch("nodemove", {});
  };

  /**
   * Runs on the mousedown event for a given node vertex.
   * Initializes a new input-anchored or output-anchored edge
   */
  const initEdge = (
    isOutputVertex: boolean,
    vertex:
      | keyof ReturnType<typeof transform>
      | keyof Parameters<typeof transform>[0]
  ) => {
    isDrawingNewEdge = true;

    // check for existing connections and delete if it exists

    const vertexConnection = getVertexConnection(
      node.uuid,
      vertex.toString(),
      isOutputVertex
    );

    if (vertexConnection) {
      delete $panelConnections[vertexConnection.uuid][vertexConnection.vertex];

      // create a new output-anchored edge, since we're essentially
      // "disconnecting" the existing edge at the output vertex.
      dispatch("startedge", {
        isOutputVertex: false,
        node: vertexConnection.uuid,
        vertex: vertexConnection.vertex,
      });
    } else {
      // if this node has no connection, then we need to start an input-anchored phantom edge.
      dispatch("startedge", { isOutputVertex, node, vertex });
    }
  };

  /**
   * Runs on the mouseup event for a given node vertex.
   * If checks pass, then connects the given vertex to another node's vertex.
   */
  const connectEdge = (
    isOutputVertex: boolean,
    vertex:
      | keyof ReturnType<typeof transform>
      | keyof Parameters<typeof transform>[0]
  ) => {
    if (!isDrawingNewEdge) return;

    // if the node has a connection then remove it
    const vertexConnection = getVertexConnection(
      node.uuid,
      vertex.toString(),
      isOutputVertex
    );
    if (vertexConnection) {
      delete $panelConnections[vertexConnection.uuid][vertexConnection.vertex];
    }

    // TODO: if we're drawing an output-anchored one, then
    // create a new connection via the endedge event
    dispatch("endedge", { isOutputVertex, node, vertex });
  };
</script>

<svelte:window
  on:mousemove={(e) => {
    if (!hovering) $selectedNodeUUID = null;
    if (isMoving) moveNode(e.clientX, e.clientY);
  }}
  on:touchmove={(e) => {
    if (!hovering) $selectedNodeUUID = null;
    if (isMoving) moveNode(e.touches[0].clientX, e.touches[0].clientY);
  }}
  on:mouseup={() => {
    isMoving = false;
    isDrawingNewEdge = false;
  }}
  on:touchend={() => {
    isMoving = false;
    isDrawingNewEdge = false;
  }}
/>

<div id="operation" class="hidden">
  <span>Press spacebar to grab</span>
</div>

<article
  class="rounded-md shadow-lg border-zinc-900 bg-zinc-925 absolute min-w-[100px]"
  style="left: {pos[0] + $panelPos[0]}px; top: {pos[1] + $panelPos[1]}px;"
  on:mouseenter={() => {
    $selectedNodeUUID = uuid;
    hovering = true;
  }}
  on:mouseleave={() => (hovering = false)}
  bind:this={ref}
>
  <header class="py-0.5 px-2 border-b border-zinc-900">
    <p class="font-mono uppercase text-zinc-600 text-center">
      {title}
    </p>
  </header>
  <main class="flex py-1.5 gap-2 relative">
    {#if inputs}
      <ul class="flex-col relative -left-1">
        {#each Object.entries(inputs) as [key, val]}
          <li class="flex items-center gap-1">
            <button
              on:mousedown={() => initEdge(false, key)}
              on:touchstart={() => initEdge(false, key)}
              on:mouseup={() => connectEdge(false, key)}
              on:touchend={() => connectEdge(false, key)}
              class="w-[9px] h-[9px] rounded-full bg-blue-400 border border-blue-400/25 input"
              id="input-{key}"
            ></button>
            <p>{key}</p>
          </li>
        {/each}
      </ul>
    {/if}
    <div class="flex-grow">
      <slot />
    </div>
    {#if outputs}
      <ul class="flex-col relative -right-1">
        {#each Object.entries(outputs) as [key, val]}
          <li class="flex items-center gap-1">
            <p>{key}</p>
            <button
              on:mousedown|stopPropagation={() => initEdge(true, key)}
              on:touchstart|stopPropagation={() => initEdge(true, key)}
              on:mouseup={() => connectEdge(true, key)}
              on:touchend={() => connectEdge(true, key)}
              class="w-[9px] h-[9px] rounded-full bg-blue-400 border border-blue-400/25 output"
              id="output-{key}"
            ></button>
          </li>
        {/each}
      </ul>
    {/if}
  </main>
  <button
    class="w-full h-4 bg-white/10"
    aria-describedby="operation"
    on:mousedown|stopPropagation={(e) => initMoveNode(e.clientX, e.clientY)}
    on:touchstart|stopPropagation={(e) =>
      initMoveNode(e.touches[0].clientX, e.touches[0].clientY)}
  ></button>
</article>
