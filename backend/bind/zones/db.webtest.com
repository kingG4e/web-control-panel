$TTL 3600
$ORIGIN webtest.com.
@   IN SOA ns1.webtest.com. admin.webtest.com. (
        2025092701
        3600
        1800
        1209600
        300 )

@       IN NS  ns1.webtest.com.
ns1     IN A   127.0.0.1

@       IN A   127.0.0.1
www     IN CNAME webtest.com.





; เมล (ใส่เฉพาะใช้จริง)
@    IN    MX    10    mail.webtest.com.
mail    IN A   127.0.0.1

