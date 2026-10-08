FROM ubuntu:24.04
RUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
      neofetch nano vim-tiny less curl ca-certificates file bc tree \
 && rm -rf /var/lib/apt/lists/* /usr/share/doc/* /usr/share/man/* /usr/share/locale/* /var/cache/*
RUN printf '\nneofetch --off 2>/dev/null || true\necho "Ubuntu 24.04 running in your browser (x86-64 emulated with Bochs via container2wasm). No network in this VM."\n' >> /root/.bashrc
WORKDIR /root
CMD ["/bin/bash"]
