<script lang="ts">
  import Icon from "./Icon.svelte";

  export let name: App.Icon;
  export let alt: string;

  export let toggles: boolean = false;
  export let toggled = false;

  export let showOutline: boolean = false;
</script>

<button
  on:click
  class="w-6 h-6 flex items-center justify-center text-zinc-700 dark:text-zinc-400 {toggled
    ? 'text-zinc-800 dark:text-zinc-300 bg-zinc-200 dark:bg-zinc-900'
    : ''} {showOutline
    ? 'border border-zinc-200 dark:border-zinc-900'
    : ''} rounded-md hover:scale-105 active:scale-95 transition-all hover:bg-zinc-200 dark:hover:bg-zinc-900"
  aria-label={alt}
  {...$$restProps}
  on:click={() => {
    if (toggles) toggled = !toggled;
  }}
>
  <Icon bind:name />
</button>
