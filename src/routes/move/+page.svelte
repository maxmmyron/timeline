<script lang=ts>
    import { writable } from "svelte/store";


    let objs = writable({
        x: {
            ref: null,
            pos: {x: 0, y: 0}
        },
        y: {
            ref: null,
            pos: {x: 0, y: 0}
        }
    })

    // @ts-ignore
    $objs.x.ref = $objs.y
    // @ts-ignore
    $objs.y.ref = $objs.x;

    const handleMove = () => {
        $objs.x.pos.x += 10;
        // @ts-ignore
        $objs.x.ref.pos.x += 10;
    }

</script>

<button on:click={handleMove}>move</button>

<div style="transform: translate({$objs.x.pos.x}px, {$objs.x.pos.y}px); background:red;">X</div>
<div style="transform: translate({$objs.y.pos.x}px, {$objs.y.pos.y}px); background: blue;">Y</div>

<style>
    div {
        width: 100px;
        height: 100px;
    }
</style>