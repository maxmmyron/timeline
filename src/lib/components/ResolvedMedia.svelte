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
    matrix: [1, 0, 0, 1, 0, 0],
  });
</script>

<article
  class="p-2 rounded-md border dark:bg-zinc-900 border-zinc-300 dark:border-zinc-800 flex gap-2 items-center justify-between"
>
  <header class="flex flex-col gap-2">
    <p>{file.title}</p>
    <p>{file.duration.toPrecision(3)}s</p>
  </header>
  <div class="flex flex-col gap-2">
    <button
      on:click={() => ($videoClips = [...$videoClips, createClip(file)])}
      class="bg-zinc-800 p-1 w-5 h-5 rounded-md shadow-md flex items-center justify-center border border-zinc-700"
    >
      +
    </button>
    <!-- TODO: add delete button -->
  </div>
</article>
