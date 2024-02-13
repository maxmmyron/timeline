<script lang="ts">
  import CloseIcon from "$lib/icon/CloseIcon.svelte";
  import IconButton from "../IconButton.svelte";

  export let isAutomationVisible: boolean;
  export let automation: App.Automation;

  $: type = automation.type;
  $: uuid = automation.uuid;
</script>

<section
  class="space-y-2 pb-2 border-b border-zinc-300 dark:border-zinc-800 border-dashed"
>
  <header class="flex justify-between items-center">
    <h4 class="text-zinc-600 dark:text-zinc-400">Edit {type} automation</h4>
    <IconButton alt="Close" on:click={() => (isAutomationVisible = false)}>
      <CloseIcon />
    </IconButton>
  </header>
  <main class="p-1 rounded-md bg-zinc-100 dark:bg-zinc-800/15"></main>
</section>
