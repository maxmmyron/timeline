<script lang="ts">
  import { ffmpeg } from "$lib/stores";
  import { onMount } from "svelte";
  import "../app.css";

  onMount(async () => {
    if (!$ffmpeg.isLoaded()) await $ffmpeg.load();
  });
</script>

<main>
  <slot />
</main>

<style>
  main {
    height: 100vh;
    display: grid;
    grid-template-columns: 1fr;
    grid-template-rows: 48px 96px 1fr 48px 128px;
    gap: 0.5rem;
  }
</style>
