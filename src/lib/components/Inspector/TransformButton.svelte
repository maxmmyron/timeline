<script lang="ts">
  import OriginSpacer from "$lib/icon/OriginSpacer.svelte";

  // binding
  export let origin: [number, number] = [0.5, 0.5];

  export let value: [number, number] = [0, 0];
</script>

<button
  class="w-5 h-5 flex justify-center items-center hover:scale-105 active:scale-95 translate-transform"
  on:click={() => (origin = value)}
>
  {#if $$slots.default}
    {#if origin[0] === value[0] && origin[1] === value[1]}
      <slot />
    {:else}
      <OriginSpacer />
    {/if}
  {:else}
    <OriginSpacer />
  {/if}
</button>
