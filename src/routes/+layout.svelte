<script lang="ts">
  import { ffmpeg } from "$lib/stores";
  import { onMount } from "svelte";
  import "../app.pcss";

  onMount(async () => {
    if (!$ffmpeg.isLoaded()) await $ffmpeg.load();
  });
</script>

<main>
  <slot></slot>
</main>

<style>
  main {
    height: 100vh;
    display: grid;
    grid-template-columns: 1fr;
    grid-template-rows: 2rem 8rem 1fr 3rem 8rem;

    padding: 0.5rem;
    gap: 0.5rem;
  }

  @media (min-width: 1024px) {
    main {
      grid-template-columns: 280px 1fr;
      grid-template-rows: 2rem 1fr 3rem 8rem;
    }
  }
</style>
