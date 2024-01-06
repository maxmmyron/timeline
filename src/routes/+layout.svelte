<script lang="ts">
  import { createFFmpeg } from "@ffmpeg/ffmpeg";
  import { onMount } from "svelte";

  let ffmpeg = createFFmpeg({ log: true });

  onMount(async () => {
    if (!ffmpeg.isLoaded()) await ffmpeg.load();
  });
</script>

<slot />
