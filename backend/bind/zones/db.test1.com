$TTL    86400
@       IN      SOA     ns1.test1.com. admin.test1.com. (
                        2025062216      ; Serial
                        3600     ; Refresh
                        1800       ; Retry
                        604800      ; Expire
                        86400 )   ; Minimum TTL

; Name servers
@       IN      NS      ns1.test1.com.
@       IN      NS      ns2.test1.com.

; Name server A records
ns1     IN      A       127.0.0.1
ns2     IN      A       127.0.0.1

