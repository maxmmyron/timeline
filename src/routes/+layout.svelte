<script lang="ts">
  import { aCtx } from "$lib/stores";
  import { onMount } from "svelte";
  import "../app.pcss";
  import { toBlobURL } from "@ffmpeg/util";
  import { FFmpeg } from "@ffmpeg/ffmpeg";

  let ffmpeg = new FFmpeg();
  const loadFFmpeg = async () => {
    const baseUrl = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm";

    ffmpeg.on("log", ({ message }) => {
      console.log(message);
    });

    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseUrl}/ffmpeg-core.js`, "text/javascript"),
      wasmURL: await toBlobURL(
        `${baseUrl}/ffmpeg-core.wasm`,
        "application/wasm"
      ),
    });
  };

  onMount(async () => {
    await loadFFmpeg();
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
