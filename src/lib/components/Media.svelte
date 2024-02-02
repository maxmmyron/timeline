<script lang="ts">
  import { audioClips, videoClips } from "$lib/stores";
  import { createClip } from "$lib/utils";

  export let title: string;
  export let media: Promise<App.Media>;

  export let removeMedia: () => void;
</script>

<article
  class="p-2 rounded-md border dark:bg-zinc-900 border-zinc-300 dark:border-zinc-800 flex gap-2 items-center justify-between"
>
  <header class="flex flex-col gap-2 min-w-0">
    <p class="text-ellipsis overflow-hidden whitespace-nowrap">
      {title}
    </p>
    {#await media}
      <p>Loading...</p>
    {:then media}
      <p>{media.duration.toPrecision(3)}s - {media.type}</p>
    {/await}
  </header>
  <div class="flex flex-col gap-2">
    {#await media then media}
      <button
        on:click={() => {
          if (media.type === "video")
            $videoClips = [...$videoClips, createClip(media)];
          else $audioClips = [...$audioClips, createClip(media)];
        }}
        class="bg-zinc-800 p-1 w-5 h-5 rounded-md shadow-md flex items-center justify-center border border-zinc-700"
      >
        +
      </button>
      <button
        on:click={removeMedia}
        class="bg-zinc-800 p-1 w-5 h-5 rounded-md shadow-md flex items-center justify-center border border-zinc-700"
      >
        ×
      </button>
    {:catch}
      <button
        on:click={removeMedia}
        class="bg-zinc-800 p-1 w-5 h-5 rounded-md shadow-md flex items-center justify-center border border-zinc-700"
      >
        ×
      </button>
    {/await}
  </div>
</article>
