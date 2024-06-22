<script lang="ts">
  export let panels: string[];
  export let currentPanel = panels[0];

  export let bg = "bg-zinc-950";
</script>

<div class="flex flex-col overflow-hidden">
  <div class="flex gap-0.5 z-10">
    {#each panels as panel}
      <button
        class="h-6 px-2 {bg} text-zinc-500 border border-zinc-800 rounded-t-sm capitalize mb-[-1px]"
        class:border-b-0={panel === currentPanel}
        on:click={() => (currentPanel = panel)}
      >
        {panel}
      </button>
    {/each}
  </div>
  <div
    class="flex-grow rounded-sm rounded-tl-none {bg} border border-zinc-800 p-1 overflow-hidden relative"
  >
    <slot />
  </div>
</div>
