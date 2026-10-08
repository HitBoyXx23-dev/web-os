# Ubuntu 18.04 LTS (i386) for the v86 emulator: Ubuntu's own kernel + userland on an ext4 disk.
FROM i386/ubuntu:bionic
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y --no-install-recommends \
      linux-image-generic- $(apt-cache depends linux-image-generic | awk '/Depends: linux-image-[0-9]/{print $2}') \
      systemd-sysv udev kmod initramfs-tools iproute2 iputils-ping isc-dhcp-client ca-certificates \
      curl wget nano vim-tiny less htop neofetch sudo bash-completion locales lsb-release ubuntu-minimal- \
 && apt-get clean && rm -rf /var/lib/apt/lists/*
# Root filesystem is the first disk; load the drivers v86 provides from the initramfs.
RUN printf '%s\n' ata_piix ata_generic libata sd_mod ext4 virtio virtio_ring virtio_pci virtio_net >> /etc/initramfs-tools/modules \
 && sed -i "s/^MODULES=.*/MODULES=list/" /etc/initramfs-tools/initramfs.conf \
 && update-initramfs -u -k all
RUN locale-gen en_US.UTF-8 && echo 'LANG=en_US.UTF-8' > /etc/default/locale \
 && printf '/dev/sda / ext4 defaults,noatime 0 1\n' > /etc/fstab \
 && passwd -d root \
 && useradd -m -s /bin/bash -G sudo ubuntu && passwd -d ubuntu && echo 'ubuntu ALL=(ALL) NOPASSWD:ALL' > /etc/sudoers.d/ubuntu
# (hostname, /etc/hosts and resolv.conf are written when the disk image is assembled: Docker mounts them read-only.)
# Auto-login on the screen and the serial console; DHCP on every wired interface.
RUN for t in getty@tty1 serial-getty@ttyS0; do mkdir -p /etc/systemd/system/$t.service.d && \
      printf '[Service]\nExecStart=\nExecStart=-/sbin/agetty --autologin ubuntu --noclear %%I $TERM\n' > /etc/systemd/system/$t.service.d/autologin.conf; done \
 && printf '[Match]\nName=en* eth*\n[Network]\nDHCP=yes\n' > /etc/systemd/network/20-wired.network \
 && systemctl enable systemd-networkd systemd-resolved \
 && systemctl mask apt-daily.timer apt-daily-upgrade.timer motd-news.timer systemd-timesyncd.service e2scrub_reap.service 2>/dev/null || true
RUN printf '\n[ -z "$HITBOY_SHOWN" ] && export HITBOY_SHOWN=1 && neofetch\necho "Ubuntu 18.04 in VMBox. Internet works (try: sudo apt update)."\n' >> /home/ubuntu/.bashrc
RUN rm -rf /usr/share/doc/* /usr/share/man/* /var/cache/apt/* /var/log/*
