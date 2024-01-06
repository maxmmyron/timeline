<script lang="ts">
  import { ffmpeg } from "$lib/stores";
  import { onMount } from "svelte";

  onMount(async () => {
    if (!$ffmpeg.isLoaded()) await $ffmpeg.load();
  });
</script>

<slot />
