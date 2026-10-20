# Lists or extracts members of a remote zip using HTTP range requests.
import sys, struct, zlib, urllib.request
url, out = sys.argv[1], sys.argv[2]; want = sys.argv[3:]
def get(a, b):
    r = urllib.request.Request(url, headers={'Range': f'bytes={a}-{b}'})
    return urllib.request.urlopen(r).read()
size = int(urllib.request.urlopen(urllib.request.Request(url, method='HEAD')).headers['Content-Length'])
tail = get(size - 65536, size - 1)
i = tail.rfind(b'PK\x05\x06')
cd_size, cd_off = struct.unpack('<II', tail[i+12:i+20])
cd = get(cd_off, cd_off + cd_size - 1)
p = 0
while p < len(cd):
    (sig, _, _, _, method, _, _, crc, csize, usize, nlen, elen, clen, _, _, _, off) = struct.unpack('<IHHHHHHIIIHHHHHII', cd[p:p+46])
    name = cd[p+46:p+46+nlen].decode(); p += 46 + nlen + elen + clen
    if not want: print(name, usize); continue
    if name.split('/')[-1] in want:
        h = get(off, off + 29)
        n2, e2 = struct.unpack('<HH', h[26:30])
        data = get(off + 30 + n2 + e2, off + 30 + n2 + e2 + csize - 1)
        if method == 8: data = zlib.decompress(data, -15)
        open(f"{out}/{name.split('/')[-1]}", 'wb').write(data); print('got', name, len(data))
