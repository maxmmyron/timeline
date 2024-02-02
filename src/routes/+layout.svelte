<script lang="ts">
  import { ffmpeg, aCtx } from "$lib/stores";
  import { onMount } from "svelte";
  import "../app.pcss";

  onMount(async () => {
    if (!$ffmpeg.isLoaded()) await $ffmpeg.load();
    if (!$aCtx)
      $aCtx = new AudioContext({
        latencyHint: "interactive",
      });
  });
</script>

<main
  class="h-dvh p-2 grid gap-2 grid-cols-1 grid-rows-[2rem,8rem,1fr,3rem,8rem] lg:grid-cols-[280px,1fr] lg:grid-rows-[2rem,1fr,3rem,8rem] dark:bg-zinc-950"
>
  <slot />
</main>
