<script>
    let arr = [];
    let map = new Map();

    console.log("---- Array.push() vs Map.set() ----")

    let t = performance.now();
    for (let i = 0; i < 10000000; i++) {
        arr.push(i);
    }
    let a_dur = performance.now() - t;

    t = performance.now();
    for (let i = 0; i < 10000000; i++) {
        map.set(i, i);
    }
    let m_dur = performance.now() - t;

    console.log("arr", a_dur);
    console.log("map", m_dur);
    console.log(`map.set() is ${m_dur / a_dur} times slower than Array.push()`);

    console.log("---- Array.find() vs Map.get() ----");
    t = performance.now();
    for (let i = 0; i < 100; i++) {
        arr.find(x => x === Math.floor(Math.random() * 10000000));
    }
    a_dur = performance.now() - t;

    t = performance.now();
    for (let i = 0; i < 100; i++) {
        map.get(Math.floor(Math.random() * 10000000));
    }
    m_dur = performance.now() - t;

    console.log("arr", a_dur);
    console.log("map", m_dur);
    console.log(`map.get() is ${m_dur / a_dur} times faster than Array.find()`);

    console.log("---- Array.splice() vs Map.delete() ----");
    t = performance.now();
    for (let i = 0; i < 100; i++) {
        arr.splice(Math.floor(Math.random() * 10000000), 1);
    }
    a_dur = performance.now() - t;

    t = performance.now();
    for (let i = 0; i < 100; i++) {
        map.delete(Math.floor(Math.random() * 10000000));
    }
    m_dur = performance.now() - t;

    console.log("arr", a_dur);
    console.log("map", m_dur);
    console.log(`map.delete() is ${a_dur / m_dur} times faster than Array.splice()`);
</script>