<script lang="ts">
  export let alt: string;
</script>

<button
  on:click
  class="w-5 h-5 flex items-center justify-center bg-zinc-800 border-t border-t-zinc-500 shadow-sm rounded-md"
  aria-label={alt}
  {...$$restProps}
>
  <slot />
</button>
