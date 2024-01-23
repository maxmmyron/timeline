<script lang="ts">
  import { videoClips } from "$lib/stores";
  import { createClip } from "$lib/utils";

  export let file: App.Media;
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
