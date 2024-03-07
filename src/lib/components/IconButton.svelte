<script lang="ts">
  export let alt: string;
  export let toggles: boolean = false;
  export let showOutline: boolean = false;

  export let toggled = false;
</script>

<button
  on:click
  class="w-6 h-6 flex items-center justify-center {toggled
    ? 'bg-zinc-300 dark:bg-zinc-900'
    : ''} {showOutline
    ? 'border border-zinc-300 dark:border-zinc-900'
    : ''} shadow-sm rounded-md hover:scale-105 active:scale-95 transition-all hover:bg-zinc-300 dark:hover:bg-zinc-900"
  aria-label={alt}
  {...$$restProps}
  on:click={() => {
    if (toggles) toggled = !toggled;
  }}
>
  <slot />
</button>
