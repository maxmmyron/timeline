<script>
  import { res, showPreferences } from "$lib/stores";
  import Modal from "./Modal.svelte";
</script>

<Modal bind:show={$showPreferences}>
  <section>
    <header class="col-start-1 grid grid-cols-subgrid">
      <div class="flex justify-between">
        <h2 class="text-sm font-mono">Video Settings</h2>
      </div>
    </header>

    <section class="col-span-full grid grid-cols-subgrid gap-2">
      <p>Resolution</p>
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
    </section>
  </section>
</Modal>
