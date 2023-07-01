<script>
  /**
   * @type {{id: string; data: Promise<App.Media>}[]}
   */
  let media = [];

  /**
   * @type {{id: string; data: App.Media}[]}
   */
  let resolved = [];

  /**
   * @type {{id: string; mediaID: string}[]}
   */
  let timeline = [];

  /**
   * @type {Map<string, string>}
   */
  let buffer = new Map();

  /**
   * Adds new promise to media
   */
  const addMedia = async () => {
    let id = Math.random().toString(36).substring(2, 9);

    media = [
      ...media,
      {
        id,
        data: new Promise((resolve, reject) =>
          setTimeout(() => {
            if (Math.random() > 0.5) reject("Something went wrong");
            else {
              /**
               * @type {App.Media | null}
               */
              let data = null;
              switch (Math.floor(Math.random() * 3)) {
                case 0:
                  data = {
                    type: "A",
                    foo: Math.random().toString(36).substring(2, 9),
                    bar: Math.random() * 100,
                  };
                  break;
                case 1:
                  data = {
                    type: "B",
                    baz: Math.random().toString(36).substring(2, 9),
                    qux: Math.random() * 100,
                  };
                  break;
                case 2:
                  data = {
                    type: "C",
                    fizz: Math.random().toString(36).substring(2, 9),
                    buzz: Math.random() * 100,
                  };
                  break;
                default:
                  reject("Something went wrong");
              }

              if (data) {
                resolved = [
                  ...resolved,
                  {
                    id,
                    data,
                  },
                ];
                resolve(data);
              }
            }
          }, Math.random() * 5000)
        ),
      },
    ];
  };

  /**
   * Removes element from media based on ID
   *
   * @param {string} id
   */
  const removeMedia = (id) => {
    media = media.filter((clip) => clip.id !== id);
    resolved = resolved.filter((clip) => clip.id !== id);
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

    buffer = buffer.set(mediaID, Math.random().toString(36).substring(2, 9));
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
        {:then data}
          <button style="padding: 8px;" on:click={() => removeMedia(id)}>x</button>
          <button style="padding: 8px;" on:click={() => addTimeline(id)}>+</button>
          {#if data.type === "A"}
            <p>({id}): {data.type}; {data.foo}, {data.bar}</p>
          {:else if data.type === "B"}
            <p>({id}): {data.type}; {data.baz}, {data.qux}</p>
          {:else if data.type === "C"}
            <p>({id}): {data.type}; {data.fizz}, {data.buzz}</p>
          {/if}
        {:catch error}
          <button style="padding: 8px;" on:click={() => removeMedia(id)}>x</button>
          <p>({id}): {error}</p>
        {/await}
      </div>
    {/each}
  </div>

  <div style="width: 100%">
    <h2>resolved</h2>
    {#each resolved as { id, data }}
      <div style="display:flex; gap:16px;">
        {#if data.type === "A"}
          <p>({id}): {data.type}; {data.foo}, {data.bar}</p>
        {:else if data.type === "B"}
          <p>({id}): {data.type}; {data.baz}, {data.qux}</p>
        {:else if data.type === "C"}
          <p>({id}): {data.type}; {data.fizz}, {data.buzz}</p>
        {/if}
      </div>
    {/each}
  </div>

  <div style="width: 100%;">
    <h2>timeline</h2>
    {#each timeline as { id, mediaID }}
      <div style="display:flex; gap:16px;">
        <button style="padding: 8px;" on:click={() => removeTimeline(id)}>x</button>
        <p>({id}): {mediaID} ; {resolved.find((m) => m.id === mediaID)?.data.type}</p>
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
