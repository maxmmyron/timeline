<script lang="ts" context="module">
  /**
   * True if any existing node is currently hovered over.
   */
  let hovering: boolean = false;
  let isDrawingNewEdge: boolean = false;
</script>

<script lang="ts" generics="T extends (...args: any) => [any, any]">
  import {
    disconnectNodes,
    getNodeConnectionData,
    getClipByUUID,
  } from "$lib/utils";

  import { createEventDispatcher, onMount } from "svelte";
  import {
    selectedNodeUUID,
    panelPos,
    nodeInConnections,
    nodeOutConnections,
    selected,
  } from "$lib/stores";

  export let node: App.EditorNode<T>;
  export let inputs: Parameters<typeof transform>[0];
  export let outputs: ReturnType<typeof transform>[0];
  export let internalOutputs: ReturnType<typeof transform>[1];

  export let ref: HTMLElement;
  let initMouse: [number, number] = [0, 0];
  let initPos: [number, number] = [0, 0];

  let pos: [number, number] = node.pos;
  const { uuid, title, transform } = node;

  const dispatch = createEventDispatcher<{
    transform: [
      ReturnType<typeof transform>[0],
      ReturnType<typeof transform>[1],
    ];
    startedge: {
      vertexType: "in" | "out";
      node: App.EditorNode<T> | string;
      vertex:
        | keyof ReturnType<typeof transform>
        | keyof Parameters<typeof transform>[0];
    };
    endedge: {
      vertexType: "in" | "out";
      node: App.EditorNode<T> | string;
      vertex:
        | keyof ReturnType<typeof transform>
        | keyof Parameters<typeof transform>[0];
    };
    nodemove: {};
  }>();

  // accept input arg to keep reactivity
  const transformWrapper = (_i: typeof inputs) => {
    // console.log(`running transform of ${title}`);
    let [out, internalOut] = transform(_i);
    node.out = out;
    node.internalOut = out;
    return [out, internalOut];
  };

  // run transform & dispatcher when output changes
  $: [outputs, internalOutputs] = transformWrapper(inputs);
  $: dispatch("transform", [outputs, internalOutputs]);

  let isMoving = false;

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
    vertexType: "in" | "out",
    vertex:
      | keyof ReturnType<typeof transform>
      | keyof Parameters<typeof transform>[0]
  ) => {
    isDrawingNewEdge = true;

    // check for existing connections and delete if it exists
    const connData = getNodeConnectionData(vertexType, uuid, vertex.toString());

    if (connData) {
      // if we have an existing connection, remove it and start an edge from the opposite node/vertex pair.
      $nodeOutConnections[node.uuid][vertex.toString()] = null;
      $nodeInConnections[connData[0]][connData[1]] = null;

      disconnectNodes(
        getClipByUUID(...$selected!).nodes.find((n) => n.uuid === connData[0])!,
        connData[1],
        node,
        vertex.toString()
      );

      dispatch("startedge", {
        vertexType: vertexType === "in" ? "out" : "in",
        node: connData[0],
        vertex: connData[1],
      });
    } else {
      dispatch("startedge", { vertexType, node, vertex });
    }
  };

  /**
   * Runs on the mouseup event for a given node vertex.
   * If checks pass, then connects the given vertex to another node's vertex.
   */
  const connectEdge = (
    vertexType: "in" | "out",
    vertex:
      | keyof ReturnType<typeof transform>
      | keyof Parameters<typeof transform>[0]
  ) => {
    if (!isDrawingNewEdge) return;

    // if the node has a connection, then remove it
    const connData = getNodeConnectionData(vertexType, uuid, vertex.toString());
    const existingNodes = getClipByUUID(...$selected!).nodes;

    if (connData) {
      // if we have an existing connection, remove it
      disconnectNodes(
        existingNodes.find((n) => n.uuid === connData[0])!,
        connData[1],
        existingNodes.find((n) => n.uuid === uuid)!,
        vertex.toString()
      );
    }

    // TODO: if we're drawing an output-anchored one, then
    // create a new connection via the endedge event
    dispatch("endedge", { vertexType, node, vertex });
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
              on:mousedown|stopPropagation={() => initEdge("in", key)}
              on:touchstart|stopPropagation={() => initEdge("in", key)}
              on:mouseup={() => connectEdge("in", key)}
              on:touchend={() => connectEdge("in", key)}
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
              on:mousedown|stopPropagation={() => initEdge("out", key)}
              on:touchstart|stopPropagation={() => initEdge("out", key)}
              on:mouseup={() => connectEdge("out", key)}
              on:touchend={() => connectEdge("out", key)}
              class="w-[9px] h-[9px] rounded-full bg-blue-400 border border-blue-400/25 output"
              id="output-{key}"
            ></button>
          </li>
        {/each}
      </ul>
    {/if}
  </main>
  <p class="text-center">{uuid.slice(-6)}</p>
  {#if outputs}
    <p class="text-center">{Object.values(outputs)}</p>
  {/if}
  <button
    class="w-full h-4 bg-white/10"
    aria-describedby="operation"
    on:mousedown|stopPropagation={(e) => initMoveNode(e.clientX, e.clientY)}
    on:touchstart|stopPropagation={(e) =>
      initMoveNode(e.touches[0].clientX, e.touches[0].clientY)}
  ></button>
</article>
