<script lang="ts">
  import { aCtx } from "$lib/stores";
  import { onMount } from "svelte";
  import "../app.pcss";

  onMount(async () => {
    $aCtx = new AudioContext();
  });
</script>

<main
  class="h-dvh p-0.5 grid gap-0.5 grid-cols-[380px,auto,380px] grid-rows-[auto,360px] bg-zinc-50 dark:bg-zinc-950"
>
  {#if $aCtx}
    <slot />
  {:else}
    <div class="row-span-full col-span-full flex items-center justify-center">
      <p>Loading...</p>
    </div>
  {/if}
</main>
