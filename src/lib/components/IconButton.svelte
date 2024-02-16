<script lang="ts">
  export let alt: string;
  export let toggles: boolean = false;

  let toggled = false;
</script>

<button
  on:click
  class="w-5 h-5 flex items-center justify-center bg-zinc-200 dark:bg-zinc-800 border-t border-t-zinc-100 dark:border-t-zinc-500 shadow-sm rounded-md {toggled
    ? 'bg-zinc-300 dark:bg-zinc-900 border-t-zinc-200 dark:border-t-zinc-700'
    : ''}"
  aria-label={alt}
  {...$$restProps}
  on:click={() => {
    if (toggles) toggled = !toggled;
  }}
>
  <slot />
</button>
