<script lang="ts">
  import { ffmpeg, aCtx } from "$lib/stores";
  import { onMount } from "svelte";
  import "../app.pcss";

  onMount(async () => {
    if (!$ffmpeg.isLoaded()) await $ffmpeg.load();
    $aCtx = new AudioContext();
  });
</script>

<main
  class="h-dvh p-0.5 grid gap-0.5 grid-cols-[340px,9fr,340px] grid-rows-[3rem,7fr,5fr] bg-zinc-50 dark:bg-zinc-950"
>
  {#if $aCtx}
    <slot />
  {:else}
    <div class="row-span-full col-span-full flex items-center justify-center">
      <p>Loading...</p>
    </div>
  {/if}
</main>
