<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import IconButton from "../IconButton.svelte";
  import Reset from "$lib/icon/Reset.svelte";

  export let name: string;
  export let scalar: number;
  export let defaultVal: number = 0;

  /**
   * Whether or not the numerical override input can exceed the bounds defined
   * by the `min` and `max` props.
   */
  export let strictBounds: boolean = false;

  // TODO: could change to restProps? how?
  export let props: svelteHTML.HTMLProps<
    "input",
    svelteHTML.HTMLAttributes<any>
  > & {
    min: number;
    max: number;
    step: number;
  };

  export let useSubgrid: boolean = false;

  const dispatcher = createEventDispatcher<{ change: number }>();
  $: dispatcher("change", scalar);

  let isHovered = false;

  let clazz = "";
  export { clazz as class };
</script>

<label
  class="{useSubgrid
    ? 'grid grid-cols-subgrid col-start-1 col-span-full'
    : 'flex gap-2'} items-center {clazz}"
>
  <p class="text-ellipsis">{name}</p>
  <input
    class="border border-zinc-300 rounded-md dark:bg-zinc-900 dark:border-zinc-800 w-10"
    type="number"
    {...props}
    bind:value={scalar}
    alt="Manual {name} property entry"
    on:change={(e) => {
      let parsed = parseFloat(e.currentTarget.value);
      if (strictBounds)
        scalar = Math.min(props.max, Math.max(props.min, parsed));
      else scalar = parsed;
    }}
    on:auxclick={(e) => {
      if (e.button === 1) scalar = defaultVal;
    }}
    on:mouseenter={() => (isHovered = true)}
    on:mouseleave={() => (isHovered = false)}
    on:wheel={(e) => {
      let mag = 1;
      if (e.shiftKey) mag = 10;
      if (isHovered) {
        e.preventDefault();
        scalar = Math.min(
          props.max,
          Math.max(props.min, scalar - Math.sign(e.deltaY) * props.step * mag)
        );
      }
    }}
  />
</label>
