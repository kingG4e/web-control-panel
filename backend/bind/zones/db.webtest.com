$TTL    86400
@       IN      SOA     ns1.webtest.com. admin.webtest.com. (
                        2025062501      ; Serial
                        3600     ; Refresh
                        1800       ; Retry
                        1209600      ; Expire
                        86400 )   ; Minimum TTL

; Name servers
@       IN      NS      ns1.webtest.com.
@       IN      NS      ns2.webtest.com.

; Name server A records
ns1     IN      A       127.0.0.1
ns2     IN      A       127.0.0.1


@    IN    A    127.0.0.1

www    IN    CNAME    webtest.com.

@    IN    MX    10    mail.webtest.com.

mail    IN    A    127.0.0.1
