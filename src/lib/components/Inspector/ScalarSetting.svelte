<script lang="ts">
  import { onMount } from "svelte";

  export let name: string;
  export let scalar: number;
  let defaultVal: number = 0;

  onMount(() => {
    defaultVal = scalar;
  });

  /**
   * Whether or not the numerical override input can exceed the bounds defined
   * by the `min` and `max` props.
   */
  export let strictBounds: boolean = false;

  export let props: svelteHTML.HTMLProps<
    "input",
    svelteHTML.HTMLAttributes<any>
  > & {
    min: number;
    max: number;
    step: number;
  };

  let clazz = "";

  export { clazz as class };
</script>

<article class="flex items-center gap-1 {clazz}">
  <label class="flex items-center gap-1 flex-grow">
    <p class="w-11 text-ellipsis">{name}</p>
    <input
      class="border border-zinc-300 rounded-md dark:bg-zinc-900 dark:border-zinc-800 max-w-28"
      type="range"
      {...props}
      bind:value={scalar}
    />
  </label>
  <input
    class="border border-zinc-300 rounded-md dark:bg-zinc-900 dark:border-zinc-800 w-10"
    type="number"
    bind:value={scalar}
    alt="Manual {name} property entry"
    on:change={(e) => {
      let parsed = parseFloat(e.currentTarget.value);
      if (strictBounds)
        scalar = Math.min(props.max, Math.max(props.min, parsed));
      else scalar = parsed;
    }}
  />
  <button
    class="bg-zinc-800 p-1 h-5 rounded-md shadow-md flex flex-col items-center justify-center border border-zinc-700"
    on:click={() => (scalar = defaultVal)}>↻</button
  >
</article>
