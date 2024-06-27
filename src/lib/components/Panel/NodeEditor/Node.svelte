<script lang="ts" context="module">
  /**
   * True if any existing node is currently hovered over.
   */
  let hovering: boolean = false;
</script>

<script lang="ts" generics="T extends object, U extends object | void">
  import { createEventDispatcher, onMount } from "svelte";
  import { selectedNodeUUID } from "$lib/stores";

  export let node: App.EditorNode<T, U>;
  export let panelOffset: [number, number];
  export let inputs: Parameters<typeof transform>[0];
  export let outputs: ReturnType<typeof transform>;

  export let ref: HTMLElement;
  let initMouse: [number, number] = [0, 0];
  let initPos: [number, number] = [0, 0];

  let pos: [number, number] = node.pos;
  const { uuid, title, transform } = node;

  const dispatch = createEventDispatcher<{
    transform: ReturnType<typeof transform>;
  }>();

  // accept input arg to keep reactivity
  const transformWrapper = (_i: typeof inputs) => {
    console.log(`running transform of ${title}`);
    return transform(_i);
  };

  // run transform & dispatcher when output changes
  $: outputs = transformWrapper(inputs);
  $: if (typeof outputs === "object") dispatch("transform", outputs);

  let isDrawingEdge = false;
  let isMoving = false;

  const drawEdge = (x: number, y: number) => {};

  const startMove = (x: number, y: number) => {
    isMoving = true;
    initPos = pos;
    initMouse = [x, y];
  };

  const move = (x: number, y: number) => {
    if (!isMoving) return;

    pos = [x - initMouse[0] + initPos[0], y - initMouse[1] + initPos[1]];
  };
</script>

<svelte:window
  on:mousemove={(e) => {
    if (!hovering) $selectedNodeUUID = null;
    if (!isDrawingEdge && !isMoving) return;
    if (isDrawingEdge) drawEdge(e.clientX, e.clientY);
    if (isMoving) move(e.clientX, e.clientY);
  }}
  on:touchmove={(e) => {
    if (!hovering) $selectedNodeUUID = null;
    if (!isDrawingEdge && !isMoving) return;
    if (isDrawingEdge) drawEdge(e.touches[0].clientX, e.touches[0].clientY);
    if (isMoving) move(e.touches[0].clientX, e.touches[0].clientY);
  }}
  on:mouseup={() => {
    isDrawingEdge = false;
    isMoving = false;
  }}
  on:touchend={() => {
    isDrawingEdge = false;
    isMoving = false;
  }}
/>

<div id="operation" class="hidden">
  <span>Press spacebar to grab</span>
</div>

<article
  class="rounded-md shadow-lg border-zinc-900 bg-zinc-925 absolute min-w-[100px]"
  style="left: {pos[0] + panelOffset[0]}px; top: {pos[1] + panelOffset[1]}px;"
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
              on:mousedown|stopPropagation={() => (isDrawingEdge = true)}
              on:touchstart|stopPropagation={() => (isDrawingEdge = true)}
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
              on:mousedown|stopPropagation={() => (isDrawingEdge = true)}
              on:touchstart|stopPropagation={() => (isDrawingEdge = true)}
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
    on:mousedown|stopPropagation={(e) => startMove(e.clientX, e.clientY)}
    on:touchstart|stopPropagation={(e) =>
      startMove(e.touches[0].clientX, e.touches[0].clientY)}
  ></button>
</article>
