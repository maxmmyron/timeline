<script lang="ts">
  import Icon from "./Icon.svelte";

  export let name: App.Icon;
  export let alt: string;

  export let toggles: boolean = false;
  export let toggled = false;

  export let showOutline: boolean = true;
</script>

<button
  on:click
  class="w-7 h-7 p-1 flex items-center justify-center text-zinc-700 dark:text-zinc-400 {toggled
    ? 'text-zinc-800 dark:text-zinc-300 bg-zinc-300 dark:bg-zinc-800'
    : ''} {showOutline
    ? 'border border-zinc-300 dark:border-zinc-800'
    : ''} rounded-md hover:scale-105 active:scale-95 transition-all hover:bg-zinc-300 dark:hover:bg-zinc-800 cursor-default"
  aria-label={alt}
  {...$$restProps}
  on:click={() => {
    if (toggles) toggled = !toggled;
  }}
>
  <Icon bind:name />
</button>
