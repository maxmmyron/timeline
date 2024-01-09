<script lang="ts">
  import { videoClips, time } from "$lib/stores";
  import { v4 as uuidv4 } from "uuid";

  export let file: App.Media;

  const createClip = (resolved: App.Media): App.Clip => ({
    media: resolved,
    offset: $time,
    start: 0,
    end: 0,
    uuid: uuidv4(),
    z: $videoClips.reduce((acc, clip) => Math.max(acc, clip.z), 0) + 1,
  });
</script>

<article>
  <header>
    <p>{file.title}</p>
    <p>{file.duration}s</p>
  </header>
  <button on:click={() => ($videoClips = [...$videoClips, createClip(file)])}>
    add
  </button>
</article>

<style>
  article {
    padding: 0.5rem;
    border-radius: 4px;
    background-color: rgba(200 200 200 / 0.5);
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }

  article > header {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  header > p:first-child {
    font-weight: bold;
  }

  button {
    border: none;
    border-radius: 4px;
    background-color: white;
    height: fit-content;
    padding: 0.25rem 0.5rem;
  }

  button:hover {
    background-color: rgba(240 240 240 / 1);
  }
</style>
