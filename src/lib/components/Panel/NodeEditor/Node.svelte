<script lang="ts" context="module">
  /**
   * True if any existing node is currently hovered over.
   */
  let hovering: boolean = false;
</script>

<script lang="ts" generics="T extends object, U extends object">
  import { selectedNodeUUID } from "$lib/stores";

  export let uuid: string;

  export let transform: (arg: T) => U;

  export let inputs: Parameters<typeof transform>[0];
  export let outputs: ReturnType<typeof transform>;

  $: outputs = transform(inputs);

  export let title: string;

  let drawingEdge = false;
</script>

<svelte:window
  on:mouseup={() => (drawingEdge = false)}
  on:mousemove={(e) => {
    if (!drawingEdge) return;
    if (!hovering) $selectedNodeUUID = null;
  }}
/>

<article 
  class="rounded-md shadow-lg border-zinc-900 bg-zinc-925" 
  on:mouseenter={() => {
    $selectedNodeUUID = uuid
    hovering = true;
  }}
  on:mouseleave={() => (hovering = false)}
>
  <header class="py-0.5 border-b border-zinc-900">
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
              on:mousedown={() => (drawingEdge = true)}
              class="w-[9px] h-[9px] rounded-full bg-blue-400 border border-blue-400/25"
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
              on:mousedown={() => (drawingEdge = true)}
              class="w-[9px] h-[9px] rounded-full bg-blue-400 border border-blue-400/25"
            ></button>
          </li>
        {/each}
      </ul>
    {/if}
  </main>
</article>
