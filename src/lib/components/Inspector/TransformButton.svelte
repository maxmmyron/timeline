<script lang="ts">
  import Icon from "$lib/components/Icon.svelte";

  // binding
  export let origin: [number, number] = [0.5, 0.5];
  export let value: [number, number] = [0, 0];

  export let name: App.Icon = "OriginSpacer";
</script>

<button
  class="w-5 h-5 flex justify-center items-center hover:scale-105 active:scale-95 translate-transform"
  on:click={() => (origin = value)}
>
  {#if origin[0] === value[0] && origin[1] === value[1]}
    <Icon bind:name />
  {:else}
    <Icon name="OriginSpacer" />
  {/if}
</button>
