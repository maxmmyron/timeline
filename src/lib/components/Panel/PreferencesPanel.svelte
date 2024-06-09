<script lang="ts">
  import { res } from "$lib/stores";

  let selected: "video" = "video";
</script>

<article class="flex gap-2 overflow-hidden p-2 h-full">
  <aside
    class="overflow-scroll pr-2 border-r border-zinc-800 min-w-40 flex flex-col gap-2"
  >
    <button
      class="px-3 py-1 rounded-md border border-zinc-900 w-full"
      class:bg-zinc-900={selected}
    >
      <p class="uppercase text-left">Video Settings</p>
    </button>
  </aside>
  <main class="flex-grow overflow-scroll max-w-md mx-auto">
    {#if selected === "video"}
      <article class="space-y-1">
        <p>RESOLUTION</p>
        <label class="flex items-center gap-1 flex-grow">
          <p class="w-11 text-ellipsis">W</p>
          <input
            class="border border-zinc-300 rounded-md dark:bg-zinc-900 dark:border-zinc-800 max-w-28"
            type="number"
            min="480"
            step="2"
            bind:value={$res[0]}
          />
        </label>
        <label class="flex items-center gap-1 flex-grow">
          <p class="w-11 text-ellipsis">H</p>
          <input
            class="border border-zinc-300 rounded-md dark:bg-zinc-900 dark:border-zinc-800 max-w-28"
            type="number"
            min="320"
            step="2"
            bind:value={$res[1]}
          />
        </label>
      </article>
    {/if}
  </main>
</article>
