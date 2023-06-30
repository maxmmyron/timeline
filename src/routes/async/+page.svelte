<script>
  /**
   * @type {{id: string, data: Promise<{x:number,y:number}>}[]}
   */
  let media = [];

  /**
   * @type {{id: string, mediaID: string}[]}
   */
  let timeline = [];

  /**
   * @type {Set<string>}
   */
  let buffer = new Set();

  /**
   * Adds new promise to media
   */
  const addMedia = async () => {
    media = [
      ...media,
      {
        id: Math.random().toString(36).substring(2, 9),
        data: new Promise((resolve, reject) =>
          setTimeout(() => {
            if (Math.random() > 0.5) reject("Something went wrong");
            else
              resolve({
                x: Math.random() * 100,
                y: Math.random() * 100,
              });
          }, 1000)
        ),
      },
    ];
  };

  /**
   * Removes resolved promise from media based on ID; removes from timeline if present
   *
   * @param {string} id
   */
  const removeMedia = (id) => {
    media = media.filter((clip) => clip.id !== id);
    timeline = timeline.filter((clip) => clip.mediaID !== id);
  };

  /**
   * Adds a new element to timeline based on mediaID
   *
   * @param {string} mediaID
   */
  const addTimeline = (mediaID) => {
    timeline = [
      ...timeline,
      {
        id: Math.random().toString(36).substring(2, 9),
        mediaID,
      },
    ];

    buffer = buffer.add(mediaID);
  };

  /**
   * Removes element from timeline based on ID, and removes the corresponding mediaID from buffer if no other timeline element contains it
   *
   * @param {string} id
   */
  const removeTimeline = (id) => {
    // @ts-ignore
    const mediaID = timeline.find((clip) => clip.id === id).mediaID;
    timeline = timeline.filter((clip) => clip.id !== id);

    if (!timeline.some((clip) => clip.mediaID === mediaID)) {
      buffer.delete(mediaID);
      // hack to force reactivity
      buffer = buffer;
    }
  };
</script>

<button style="padding: 8px;" on:click={addMedia}>Add</button>
<button
  style="padding: 8px;"
  on:click={() => {
    media = [];
  }}
>
  Clear
</button>
<button style="padding: 8px;" on:click={() => console.log(media)}>Log</button>

<div style="display:flex">
  <div style="width: 100%;">
    <h2>media</h2>
    {#each media as { id, data }}
      <div style="display:flex; gap:16px;">
        {#await data}
          <p>loading...</p>
        {:then { x, y }}
          <button style="padding: 8px;" on:click={() => removeMedia(id)}>x</button>
          <button style="padding: 8px;" on:click={() => addTimeline(id)}>+</button>
          <p>({id}): {x}, {y}</p>
        {:catch error}
          <button style="padding: 8px;" on:click={() => removeMedia(id)}>x</button>
          <p>({id}): {error}</p>
        {/await}
      </div>
    {/each}
  </div>

  <div style="width: 100%;">
    <h2>timeline</h2>
    {#each timeline as { id, mediaID }}
      <div style="display:flex; gap:16px;">
        <button style="padding: 8px;" on:click={() => removeTimeline(id)}>x</button>
        <p>({id}): {mediaID}</p>
      </div>
    {/each}
  </div>

  <div style="width: 100%;">
    <h2>buffer</h2>
    {#each [...buffer] as id}
      <p>({id})</p>
    {/each}
  </div>
</div>
