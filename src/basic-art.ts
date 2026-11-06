import type { BasicVillageId } from "./catalog.ts";
// Non-destructive masks in original 1199 × 1312 coordinates. All source pixels stay intact.
// Separate contours retain the roof, tree, street lamp and the wooden plinth; the
// lower ellipse feathers only the original floor/contact shadow into the app backdrop.
const silhouettes: Record<BasicVillageId, string> = {
  "christmas-bell-house": `M298 500 Q298 463 344 385 L420 272 L425 234 Q425 205 444 183 Q462 171 479 190 L485 228 L508 207 Q535 177 565 194 L625 242 L695 245 L690 185 Q690 158 716 150 L742 143 L742 130 L789 130 L791 145 L828 155 Q850 164 847 194 L839 277 L862 337 L920 443 Q945 480 931 521 L882 553 L882 832 L350 832 L347 575 L317 550 Q292 540 298 500 Z
M271 469 Q284 469 300 492 L308 510 L331 526 L331 573 L317 603 L319 652 L309 666 L310 842 L248 842 L250 669 L236 652 L238 606 L228 576 L230 527 L250 508 L260 488 Z
M326 632 L346 662 L363 706 L380 727 L386 834 L253 856 L251 784 L270 751 L277 710 L298 683 Z
M903 546 L922 566 L948 576 L944 606 L931 627 L950 661 L952 686 L975 716 L971 741 L999 779 L986 818 L1000 853 L820 874 L816 813 L831 783 L830 745 L842 704 L842 674 L861 641 L868 621 L860 586 L886 575 Z`,
  "snowman-forest-house": `M286 524 L318 452 L370 361 L419 272 L467 210 L485 184 L485 154 L506 142 L520 163 L523 191 L560 228 L718 249 L727 197 L735 165 L761 153 L761 136 L809 133 L817 147 L855 154 L870 179 L872 218 L872 350 L932 454 Q961 499 937 542 L894 555 L888 829 L320 855 L321 562 L293 551 Z
M307 622 L323 645 L343 682 L352 723 L381 740 L407 778 L415 857 L228 875 L230 793 L248 760 L255 715 L281 687 L283 657 Z
M887 557 L903 578 L927 584 L930 611 L914 634 L944 671 L944 701 L970 738 L965 768 L997 810 L989 859 L810 880 L811 822 L826 788 L828 748 L847 709 L845 677 L862 640 L855 612 L858 586 Z`,
};
const plinth = `M191 871 Q188 840 247 817 L312 755 L361 725 L418 739 L488 723 L561 716 L638 732 L716 733 L781 760 L842 784 L917 801 Q986 818 1011 868 L1032 929 L1040 1042 Q1041 1118 958 1148 Q785 1194 559 1183 Q305 1181 190 1114 Q159 1097 162 1043 L163 945 Q163 903 191 871 Z`;
export function basicMaskSource(id: BasicVillageId): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1199" height="1312" viewBox="0 0 1199 1312"><defs><filter id="edge" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="5"/></filter><radialGradient id="shadow"><stop stop-color="white" stop-opacity=".9"/><stop offset=".65" stop-color="white" stop-opacity=".4"/><stop offset="1" stop-color="white" stop-opacity="0"/></radialGradient></defs><ellipse cx="600" cy="1166" rx="478" ry="85" fill="url(#shadow)"/><path d="${silhouettes[id]} ${plinth}" fill="white" filter="url(#edge)"/></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
