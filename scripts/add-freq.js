import { readFileSync, writeFileSync } from 'fs'

const FREQ_MAP = {
  'ls -lah': '高频', 'cd': '高频', 'grep -rn': '高频', 'find': '高频',
  'chmod / chown': '高频', 'tar': '高频', 'ps aux': '高频', 'kill / killall': '高频',
  'curl': '高频', 'wget': '高频', 'top / htop': '高频', 'df -h': '高频',
  'systemctl': '高频', 'ssh': '高频', 'docker': '高频', 'git': '高频',
  'vim / nano': '高频', 'sudo': '高频', 'tree': '高频', 'alias': '高频',
  'history': '高频', 'jq': '高频', 'du -sh': '高频', 'pip / conda': '高频',
  'nvm / npx': '高频', 'docker logs': '高频', 'docker exec': '高频', 'docker compose': '高频',

  'netstat / ss': '中频', 'scp / rsync': '中频', 'awk / sed': '中频', 'crontab': '中频',
  'journalctl': '中频', 'ln -s': '中频', 'env / export': '中频', 'nohup / &': '中频',
  'screen / tmux': '中频', 'free -h': '中频', 'lsof': '中频', 'ip / ifconfig': '中频',
  'firewalld / iptables': '中频', 'lsblk': '中频', 'ansible': '中频', 'terraform': '中频',
  'kubectl': '中频', 'curl 健康检查': '中频', 'stat': '中频', 'watch': '中频',
  'tee': '中频', 'xargs': '中频', 'date / timedatectl': '中频', 'openssl': '中频',
  'mysql / psql': '中频', 'nginx -t': '中频', 'docker stats': '中频', 'scp 云传输': '中频',
  'rsync 云同步': '中频', 'nslookup / dig': '中频',

  'iostat / vmstat': '低频', 'sar': '低频', 'strace / ltrace': '低频', 'tcpdump': '低频',
  'nc (netcat)': '低频', 'selinux': '低频', 'useradd / passwd': '低频', 'logrotate': '低频',
  'at / batch': '低频', 'uname / hostnamectl': '低频', 'dmesg': '低频', 'modprobe / lsmod': '低频',
  'fdisk / parted': '低频', 'mkfs / mount': '低频', 'xfs_growfs / resize2fs': '低频', 'smartctl': '低频',
  'dd': '低频', 'helm': '低频', 'wget 镜像': '低频', 'supervisorctl': '低频',
  'locale': '低频', 'certbot': '低频', 'redis-cli': '低频', 'mongosh': '低频',
  'ab / wrk': '低频', 'ncdu': '低频', 'pidstat': '低频', 'nvidia-smi': '低频',
  'crictl': '低频', 'etcdctl': '低频', 'cloud-init': '低频', 'aliyun cli': '低频',
  'ossutil': '低频', 'huawei cli': '低频', 'aws cli': '低频', 'ssh 隧道': '低频',
  'fail2ban': '低频', 'logrotate 云日志': '低频', 'ampl / cloudwatch': '低频', 'systemd-analyze': '低频',
  'traceroute / mtr': '低频',
}

let content = readFileSync('src/data/skills-data.js', 'utf8')

for (const [cmd, freq] of Object.entries(FREQ_MAP)) {
  const escaped = cmd.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(`(cmd: '${escaped}',\\s*desc: '[^']*?',\\s*example: '[^']*?',\\s*tags: \\[[^\\]]*?\\])`, 'g')
  content = content.replace(regex, `$1, freq: '${freq}'`)
}

writeFileSync('src/data/skills-data.js', content)

const matches = content.match(/freq: '/g)
console.log(`已添加 freq 字段: ${matches ? matches.length : 0} 个命令`)