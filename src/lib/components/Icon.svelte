<script lang="ts">
  let icons: Record<App.Icon, string> = {
    Automation: `<path fill-rule="evenodd" clip-rule="evenodd" d="M15.25 3C14.7668 3 14.375 3.39175 14.375 3.875V4.75C14.375 5.23325 14.7668 5.625 15.25 5.625H16.125C16.6082 5.625 17 5.23325 17 4.75V3.875C17 3.39175 16.6082 3 16.125 3H15.25Z" fill="currentColor"/>
<path fill-rule="evenodd" clip-rule="evenodd" d="M8.00013 14.3485C6.95945 15.5081 5.64605 16.3437 3.875 16.3437V15.0312C5.16645 15.0312 6.14993 14.445 7.02331 13.4718C7.91787 12.475 8.64686 11.1288 9.42219 9.68887L9.44442 9.6476C10.1938 8.25573 10.9904 6.77642 11.9999 5.65153C13.0406 4.49191 14.3539 3.65625 16.125 3.65625V4.96875C14.8336 4.96875 13.8501 5.55496 12.9767 6.52816C12.0821 7.52495 11.3531 8.87122 10.5778 10.3111L10.5556 10.3524C9.80617 11.7443 9.00965 13.2236 8.00013 14.3485Z" fill="currentColor"/>
<path fill-rule="evenodd" clip-rule="evenodd" d="M3.875 14.375C3.39175 14.375 3 14.7668 3 15.25V16.125C3 16.6082 3.39175 17 3.875 17H4.75C5.23325 17 5.625 16.6082 5.625 16.125V15.25C5.625 14.7668 5.23325 14.375 4.75 14.375H3.875Z" fill="currentColor"/>
<path fill-rule="evenodd" clip-rule="evenodd" d="M9.20006 15.6875L10.4375 16.9249L11.6749 15.6875L10.4375 14.4501L9.20006 15.6875Z" fill="currentColor"/>
<path fill-rule="evenodd" clip-rule="evenodd" d="M8.32506 4.3125L9.5625 5.54994L10.7999 4.3125L9.5625 3.07506L8.32506 4.3125Z" fill="currentColor"/>
<path fill-rule="evenodd" clip-rule="evenodd" d="M10 16.125H4.3125V15.25H10V16.125Z" fill="currentColor"/>
<path fill-rule="evenodd" clip-rule="evenodd" d="M10 3.875L15.6875 3.875V4.75L10 4.75V3.875Z" fill="currentColor"/>`,
    BeginningSkip: `<path d="M10.084 2.37404C10.3584 1.96242 11 2.15668 11 2.65139L11 17.3486C11 17.8433 10.3584 18.0376 10.084 17.626L5.3698 10.5547C5.14587 10.2188 5.14587 9.7812 5.3698 9.4453L10.084 2.37404Z" fill="currentColor" stroke="currentColor" stroke-width="1.5"/>
<rect x="4" y="18" width="2" height="16" rx="0.5" transform="rotate(-180 4 18)" fill="currentColor" stroke="currentColor" stroke-width="1.5"/>
<path d="M17.084 2.37404C17.3584 1.96242 18 2.15668 18 2.65139L18 17.3486C18 17.8433 17.3584 18.0376 17.084 17.626L12.3698 10.5547C12.1459 10.2188 12.1459 9.7812 12.3698 9.4453L17.084 2.37404Z" fill="currentColor" stroke="currentColor" stroke-width="1.5"/>`,
    BottomOrigin: `<mask id="path-1-inside-1_23_240" fill="white">
<rect x="8" y="8" width="4" height="4" rx="1"/>
</mask>
<rect x="8" y="8" width="4" height="4" rx="1" fill="currentColor" stroke="currentColor" stroke-width="3" mask="url(#path-1-inside-1_23_240)"/>
<path d="M13 10H17M17 10L15 8M17 10L15 12" stroke="currentColor" stroke-width="1.5"/>
<path d="M7 10L3 10M3 10L5 12M3 10L5 8" stroke="currentColor" stroke-width="1.5"/>
<path d="M10 7L10 3M10 3L8 5M10 3L12 5" stroke="currentColor" stroke-width="1.5"/>`,
    CenterOrigin: `<mask id="path-1-inside-1_23_234" fill="white">
<rect x="8" y="8" width="4" height="4" rx="1"/>
</mask>
<rect x="8" y="8" width="4" height="4" rx="1" fill="currentColor" stroke="currentColor" stroke-width="3" mask="url(#path-1-inside-1_23_234)"/>
<path d="M13 10H17M17 10L15 8M17 10L15 12" stroke="currentColor" stroke-width="1.5"/>
<path d="M10 13L10 17M10 17L12 15M10 17L8 15" stroke="currentColor" stroke-width="1.5"/>
<path d="M7 10L3 10M3 10L5 12M3 10L5 8" stroke="currentColor" stroke-width="1.5"/>
<path d="M10 7L10 3M10 3L8 5M10 3L12 5" stroke="currentColor" stroke-width="1.5"/>`,
    ClipInspector: `<path fill-rule="evenodd" clip-rule="evenodd" d="M3 3C2.44772 3 2 3.44772 2 4V16C2 16.5523 2.44772 17 3 17H17C17.5523 17 18 16.5523 18 16V4C18 3.44772 17.5523 3 17 3H3ZM15 15C15.5523 15 16 14.5523 16 14C16 13.4477 15.5523 13 15 13C14.4477 13 14 13.4477 14 14C14 14.5523 14.4477 15 15 15ZM12 14C12 14.5523 11.5523 15 11 15C10.4477 15 10 14.5523 10 14C10 13.4477 10.4477 13 11 13C11.5523 13 12 13.4477 12 14ZM5 5C4.44772 5 4 5.44772 4 6C4 6.55228 4.44772 7 5 7H15C15.5523 7 16 6.55228 16 6C16 5.44772 15.5523 5 15 5H5ZM8 10C8 9.44772 8.44772 9 9 9H15C15.5523 9 16 9.44772 16 10C16 10.5523 15.5523 11 15 11H9C8.44772 11 8 10.5523 8 10ZM8 14C8 13.2368 7.84551 12.6327 7.53299 12.1379C7.24581 11.6832 6.86796 11.4005 6.62915 11.2218L6.6 11.2C6.33627 11.0022 6.23383 10.9142 6.15799 10.7941C6.09551 10.6952 6 10.4868 6 10C6 9.44772 5.55228 9 5 9C4.44772 9 4 9.44772 4 10C4 10.7632 4.15449 11.3673 4.46701 11.8621C4.75419 12.3168 5.13204 12.5995 5.37085 12.7782L5.4 12.8C5.66373 12.9978 5.76617 13.0858 5.84201 13.2059C5.90449 13.3048 6 13.5132 6 14C6 14.5523 6.44771 15 7 15C7.55228 15 8 14.5523 8 14Z" fill="currentColor"/>`,
    Close: `<path d="M16 4L4 16" stroke="currentColor" stroke-width="1.5"/>
<path d="M4.00003 4L16 16" stroke="currentColor" stroke-width="1.5"/>`,
    EndSkip: `<path d="M9.91603 17.626C9.64161 18.0376 9 17.8433 9 17.3486V2.65139C9 2.15668 9.64161 1.96242 9.91603 2.37404L14.6302 9.4453C14.8541 9.7812 14.8541 10.2188 14.6302 10.5547L9.91603 17.626Z" fill="currentColor" stroke="currentColor" stroke-width="1.5"/>
<rect x="16" y="2" width="2" height="16" rx="0.5" fill="currentColor" stroke="currentColor" stroke-width="1.5"/>
<path d="M2.91603 17.626C2.64161 18.0376 2 17.8433 2 17.3486V2.65139C2 2.15668 2.64161 1.96242 2.91603 2.37404L7.6302 9.4453C7.85413 9.7812 7.85413 10.2188 7.6302 10.5547L2.91603 17.626Z" fill="currentColor" stroke="currentColor" stroke-width="1.5"/>`,
    Export: `<path d="M2 12V15C2 16.1046 2.89543 17 4 17H16C17.1046 17 18 16.1046 18 15V12" stroke="currentColor" stroke-width="1.5"/>
<path d="M10 4L10 14M10 14L13 11M10 14L7 11" stroke="currentColor" stroke-width="1.5"/>`,
    Import: `<path d="M2 12V15C2 16.1046 2.89543 17 4 17H16C17.1046 17 18 16.1046 18 15V12" stroke="currentColor" stroke-width="1.5"/>
<path d="M10 14V4M10 4L7 7M10 4L13 7" stroke="currentColor" stroke-width="1.5"/>`,
    LeftOrigin: `<mask id="path-1-inside-1_23_241" fill="white">
<rect x="8" y="8" width="4" height="4" rx="1"/>
</mask>
<rect x="8" y="8" width="4" height="4" rx="1" fill="currentColor" stroke="currentColor" stroke-width="3" mask="url(#path-1-inside-1_23_241)"/>
<path d="M13 10H17M17 10L15 8M17 10L15 12" stroke="currentColor" stroke-width="1.5"/>
<path d="M10 13L10 17M10 17L12 15M10 17L8 15" stroke="currentColor" stroke-width="1.5"/>
<path d="M10 7L10 3M10 3L8 5M10 3L12 5" stroke="currentColor" stroke-width="1.5"/>`,
    Link: `<path fill-rule="evenodd" clip-rule="evenodd" d="M7.30917 8.38643C7.30917 8.38644 7.30916 8.38644 7.30916 8.38644L5.15458 10.541C3.96464 11.731 3.96464 13.6602 5.15458 14.8502C6.34452 16.0401 8.2738 16.0401 9.46374 14.8502L11.6183 12.6956C11.6198 12.6941 11.6212 12.6927 11.6227 12.6912L11.6183 12.6956L10.5577 11.6349C10.5577 11.6349 10.5577 11.6349 10.5577 11.6349L8.40308 13.7895C7.79893 14.3937 6.8194 14.3937 6.21524 13.7895C5.61108 13.1854 5.61109 12.2058 6.21524 11.6017L8.36982 9.4471C8.36982 9.4471 8.36983 9.4471 8.36983 9.44709L7.30917 8.38643Z" fill="currentColor"/>
<path fill-rule="evenodd" clip-rule="evenodd" d="M12.6956 11.6183C12.6956 11.6183 12.6956 11.6183 12.6956 11.6183L14.8502 9.46374C16.0401 8.2738 16.0401 6.34452 14.8502 5.15458C13.6602 3.96464 11.731 3.96463 10.541 5.15458L8.38644 7.30916C8.38497 7.31062 8.38351 7.31209 8.38205 7.31356L8.38644 7.30917L9.44709 8.36983C9.44709 8.36982 9.4471 8.36982 9.4471 8.36982L11.6017 6.21524C12.2058 5.61108 13.1854 5.61108 13.7895 6.21524C14.3937 6.81939 14.3937 7.79892 13.7895 8.40308L11.6349 10.5577C11.6349 10.5577 11.6349 10.5577 11.6349 10.5577L12.6956 11.6183Z" fill="currentColor"/>
<path d="M7.84779 12.157L12.157 7.84781" stroke="currentColor" stroke-width="1.5"/>`,
    MediaPool: `<path fill-rule="evenodd" clip-rule="evenodd" d="M2.5 3.5C1.94772 3.5 1.5 3.94772 1.5 4.5V7.91852C1.90696 7.07001 2.77269 6.5 3.75436 6.5H17.5V6C17.5 5.44772 17.0523 5 16.5 5H7.83333C7.61696 5 7.40643 4.92982 7.23333 4.8L5.5 3.5H2.5Z" fill="currentColor"/>
<path d="M2.80764 8.82081C2.89422 8.34546 3.30828 8 3.79145 8H17.3014C17.9254 8 18.397 8.56526 18.2852 9.17919L17.3419 14.3584C17.1687 15.3091 16.3406 16 15.3742 16H2.6986C2.07456 16 1.60296 15.4347 1.71478 14.8208L2.80764 8.82081Z" fill="currentColor"/>`,
    OriginSpacer: `<mask id="path-1-inside-1_22_227" fill="white">
<rect x="8" y="8" width="4" height="4" rx="1"/>
</mask>
<rect x="8" y="8" width="4" height="4" rx="1" stroke="currentColor" stroke-width="3" mask="url(#path-1-inside-1_22_227)"/>`,
    Pause: `<rect x="3" y="2" width="4" height="16" rx="1" fill="currentColor" stroke="currentColor" stroke-width="1.5"/>
<rect x="13" y="2" width="4" height="16" rx="1" fill="currentColor" stroke="currentColor" stroke-width="1.5"/>`,
    Play: `<path d="M5.47059 17.2157C4.80448 17.5709 4 17.0883 4 16.3333V3.66667C4 2.91175 4.80448 2.42906 5.47059 2.78431L17.3456 9.11765C18.0515 9.49412 18.0515 10.5059 17.3456 10.8824L5.47059 17.2157Z" fill="currentColor" stroke="currentColor" stroke-width="1.5"/>`,
    Pointer: `<path d="M7.89987 18.434C7.85368 18.5311 7.70852 18.5181 7.68105 18.4144L3.50392 2.64312C3.47855 2.54735 3.58122 2.4675 3.67089 2.51326L18.4372 10.0487C18.5343 10.0982 18.5145 10.2395 18.4074 10.2616L11.1221 11.7663C11.0862 11.7738 11.0559 11.7973 11.0404 11.8299L7.89987 18.434Z" fill="currentColor" stroke="currentColor"/>`,
    Reset: `<path d="M8 4L5 7L8 10" stroke="currentColor" stroke-width="1.5"/>
<path d="M5.33333 7H12C14.2091 7 16 8.79086 16 11V11C16 13.2091 14.2091 15 12 15H4" stroke="currentColor" stroke-width="1.5"/>`,
    RightOrigin: `<mask id="path-1-inside-1_23_239" fill="white">
<rect x="8" y="8" width="4" height="4" rx="1"/>
</mask>
<rect x="8" y="8" width="4" height="4" rx="1" fill="currentColor" stroke="currentColor" stroke-width="3" mask="url(#path-1-inside-1_23_239)"/>
<path d="M10 13L10 17M10 17L12 15M10 17L8 15" stroke="currentColor" stroke-width="1.5"/>
<path d="M7 10L3 10M3 10L5 12M3 10L5 8" stroke="currentColor" stroke-width="1.5"/>
<path d="M10 7L10 3M10 3L8 5M10 3L12 5" stroke="currentColor" stroke-width="1.5"/>`,
    SplitClip: `<path d="M6 16L4 16C2.89543 16 2 15.1046 2 14L2 6C2 4.89543 2.89543 4 4 4L6 4" stroke="currentColor" stroke-width="1.5"/>
<path d="M14 4L16 4C17.1046 4 18 4.89543 18 6L18 14C18 15.1046 17.1046 16 16 16H14" stroke="currentColor" stroke-width="1.5"/>
<path d="M10 3V17" stroke="currentColor"/>
<path d="M11 2L10 3L9 2H11Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<path d="M9 18L10 17L11 18L9 18Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<rect x="7" y="3.25" width="1.5" height="1.5" fill="currentColor"/>
<rect x="7" y="6" width="1.5" height="1.5" fill="currentColor"/>
<rect x="4" y="6" width="1.5" height="1.5" fill="currentColor"/>
<rect x="7" y="12.5" width="1.5" height="1.5" fill="currentColor"/>
<rect x="4" y="12.5" width="1.5" height="1.5" fill="currentColor"/>
<rect x="7" y="15.25" width="1.5" height="1.5" fill="currentColor"/>
<rect x="11.5" y="3.25" width="1.5" height="1.5" fill="currentColor"/>
<rect x="11.5" y="6" width="1.5" height="1.5" fill="currentColor"/>
<rect x="14.5" y="6" width="1.5" height="1.5" fill="currentColor"/>
<rect x="11.5" y="12.5" width="1.5" height="1.5" fill="currentColor"/>
<rect x="14.5" y="12.5" width="1.5" height="1.5" fill="currentColor"/>
<rect x="11.5" y="15.25" width="1.5" height="1.5" fill="currentColor"/>`,
    TopOrigin: `<mask id="path-1-inside-1_23_238" fill="white">
<rect x="8" y="8" width="4" height="4" rx="1"/>
</mask>
<rect x="8" y="8" width="4" height="4" rx="1" fill="currentColor" stroke="currentColor" stroke-width="3" mask="url(#path-1-inside-1_23_238)"/>
<path d="M13 10H17M17 10L15 8M17 10L15 12" stroke="currentColor" stroke-width="1.5"/>
<path d="M10 13L10 17M10 17L12 15M10 17L8 15" stroke="currentColor" stroke-width="1.5"/>
<path d="M7 10L3 10M3 10L5 12M3 10L5 8" stroke="currentColor" stroke-width="1.5"/>`,
    Unlink: `<path fill-rule="evenodd" clip-rule="evenodd" d="M6.77621 8.9194L5.15458 10.541C3.96464 11.731 3.96464 13.6602 5.15458 14.8502C6.34452 16.0401 8.2738 16.0401 9.46374 14.8502L11.0854 13.2286L10.0247 12.1679L8.40308 13.7895C7.79893 14.3937 6.8194 14.3937 6.21524 13.7895C5.61108 13.1854 5.61109 12.2058 6.21524 11.6017L7.83687 9.98006L6.77621 8.9194Z" fill="currentColor"/>
<path fill-rule="evenodd" clip-rule="evenodd" d="M13.2343 11.0797L14.8502 9.46374C16.0401 8.2738 16.0401 6.34452 14.8502 5.15458C13.6602 3.96464 11.731 3.96463 10.541 5.15458L8.38644 7.30916C8.38421 7.31138 8.38199 7.31361 8.37978 7.31584L8.92511 6.77051L9.98576 7.83116L11.6017 6.21524C12.2058 5.61108 13.1854 5.61108 13.7895 6.21524C14.3937 6.81939 14.3937 7.79892 13.7895 8.40308L12.1736 10.019L13.2343 11.0797ZM8.38 11.6119C8.38214 11.614 8.38429 11.6162 8.38644 11.6183C8.38859 11.6205 8.39074 11.6226 8.3929 11.6248L8.38 11.6119Z" fill="currentColor"/>
<path d="M14.5729 14.5729L5.43183 5.43183" stroke="currentColor" stroke-width="1.5"/>`,
    ZoomIn: `<path d="M10 7L10 13" stroke="currentColor" stroke-width="1.5"/>
<path d="M7 10H13" stroke="currentColor" stroke-width="1.5"/>
<circle cx="10" cy="10" r="6.25" stroke="currentColor" stroke-width="1.5"/>
<path d="M18 18L14 14" stroke="currentColor" stroke-width="1.5"/>`,
    ZoomOut: `<path d="M7 10H13" stroke="currentColor" stroke-width="1.5"/>
<circle cx="10" cy="10" r="6.25" stroke="currentColor" stroke-width="1.5"/>
<path d="M18 18L14 14" stroke="currentColor" stroke-width="1.5"/>`,
  };

  export let name: App.Icon;
</script>

<svg
  width="18"
  height="18"
  viewBox="0 0 20 20"
  fill="none"
  xmlns="http://www.w3.org/2000/svg"
>
  {@html icons[name]}
</svg>
