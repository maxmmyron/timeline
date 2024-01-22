<script lang="ts">
  export let time = 0;

  const timingRules: ((arg0: number) => number)[] = [
    (runtime) => runtime / 3600,
    (runtime) => (runtime % 3600) / 60,
    (runtime) => runtime % 60,
  ];
</script>

<article class="flex">
  {#each timingRules as r, i}
    <p>
      {Math.floor(r(time)).toString().padStart(2, "0")}:
    </p>
  {/each}
  <p>
    {Math.round((time % 1) * 1000)
      .toString()
      .padStart(3, "0")
      .slice(0, 3)}
  </p>
</article>
