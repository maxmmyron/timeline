<script lang="ts">
  export let show = false;
  export let title = "Preferences";

  let dialog: HTMLDialogElement;

  $: if (show && dialog) {
    dialog.showModal();
  } else {
    if (dialog) dialog.close();
  }
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<dialog
  class="shadow-lg bg-zinc-950 border border-zinc-800 p-2 backdrop:blur-md w-96 rounded-md"
  on:click|self={() => (show = false)}
  bind:this={dialog}
>
  <main on:click|stopPropagation class="space-y-2">
    <header class="flex items-center justify-between">
      <h2 class="text-lg font-bold">{title}</h2>
      <button
        class="g-zinc-800 p-1 h-5 rounded-md shadow-md flex items-center justify-center border border-zinc-700"
        on:click={() => (show = false)}
      >
        Close
      </button>
    </header>
    <hr class="border-zinc-300 dark:border-zinc-800" />
    <slot />
  </main>
</dialog>
