$TTL    86400
@       IN      SOA     ns1.test.com. admin.test.com. (
                        2025070901      ; Serial
                        3600     ; Refresh
                        1800       ; Retry
                        1209600      ; Expire
                        86400 )   ; Minimum TTL

; Name servers
@       IN      NS      ns1.test.com.
@       IN      NS      ns2.test.com.

; Name server A records
ns1     IN      A       127.0.0.1
ns2     IN      A       127.0.0.1


@    IN    A    127.0.0.1

www    IN    CNAME    test.com.

@    IN    MX    10    mail.test.com.

mail    IN    A    127.0.0.1
