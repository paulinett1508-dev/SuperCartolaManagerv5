{pkgs}: {
  deps = [
    pkgs.codex
    pkgs.vim-full
    pkgs.mongosh
    pkgs.lsof
    pkgs.psmisc
  ];
}
{ pkgs }: {
  deps = [
    pkgs.wget
  ];
}
