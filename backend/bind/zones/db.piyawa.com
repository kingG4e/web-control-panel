$TTL 3600
$ORIGIN piyawa.com.
@   IN SOA ns1.piyawa.com. admin.piyawa.com. (
        2025092706
        3600
        1800
        1209600
        300 )

@       IN NS  ns1.piyawa.com.
ns1     IN A   192.168.1.174

@       IN A   192.168.1.174
www     IN CNAME piyawa.com.




